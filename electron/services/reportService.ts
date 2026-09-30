import { sqlite } from '../db';

export const reportService = {
  getSalesReport(startDate?: string, endDate?: string) {
    let whereClause = "WHERE status != 'cancelled'";
    const params: any[] = [];

    if (startDate) {
      whereClause += ' AND sale_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND sale_date <= ?';
      params.push(endDate + ' 23:59:59');
    }

    // Totals
    const summary = sqlite.prepare(`
      SELECT
        COUNT(id) as total_bills,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(total_discount), 0) as total_discount,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(balance_due), 0) as total_credit,
        COALESCE(AVG(grand_total), 0) as average_bill_value
      FROM sales
      ${whereClause}
    `).get(...params) as any;

    // Daily breakdown
    const dailyBreakdown = sqlite.prepare(`
      SELECT
        substr(sale_date, 1, 10) as date,
        COUNT(id) as bills_count,
        COALESCE(SUM(grand_total), 0) as sales,
        COALESCE(SUM(paid_amount), 0) as collections,
        COALESCE(SUM(balance_due), 0) as credit
      FROM sales
      ${whereClause}
      GROUP BY substr(sale_date, 1, 10)
      ORDER BY date ASC
    `).all(...params) as any[];

    // Payment method breakdown
    const paymentMethods = sqlite.prepare(`
      SELECT
        payment_method,
        COUNT(id) as count,
        COALESCE(SUM(grand_total), 0) as total_amount
      FROM sales
      ${whereClause}
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `).all(...params) as any[];

    // Product-wise sales
    let productWhere = "WHERE s.status != 'cancelled'";
    const prodParams: any[] = [];
    if (startDate) {
      productWhere += ' AND s.sale_date >= ?';
      prodParams.push(startDate);
    }
    if (endDate) {
      productWhere += ' AND s.sale_date <= ?';
      prodParams.push(endDate + ' 23:59:59');
    }

    const productSales = sqlite.prepare(`
      SELECT
        si.product_id,
        si.product_name,
        p.category,
        COALESCE(SUM(si.quantity), 0) as total_qty,
        si.unit,
        COALESCE(SUM(si.taxable_amount), 0) as taxable_revenue,
        COALESCE(SUM(si.tax_amount), 0) as tax_amount,
        COALESCE(SUM(si.total_amount), 0) as total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      ${productWhere}
      GROUP BY si.product_id, si.product_name, p.category, si.unit
      ORDER BY total_revenue DESC
      LIMIT 50
    `).all(...prodParams) as any[];

    // Category breakdown
    const categorySales = sqlite.prepare(`
      SELECT
        COALESCE(p.category, 'Uncategorized') as category,
        COALESCE(SUM(si.quantity), 0) as total_qty,
        COALESCE(SUM(si.total_amount), 0) as total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      ${productWhere}
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `).all(...prodParams) as any[];

    return {
      summary,
      dailyBreakdown,
      paymentMethods,
      productSales,
      categorySales,
    };
  },

  getTaxReport(startDate?: string, endDate?: string) {
    let whereClause = "WHERE s.status != 'cancelled'";
    const params: any[] = [];

    if (startDate) {
      whereClause += ' AND s.sale_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND s.sale_date <= ?';
      params.push(endDate + ' 23:59:59');
    }

    // Tax rate breakdown (0%, 5%, 12%, 18%, 28%)
    const taxSlabs = sqlite.prepare(`
      SELECT
        si.tax_rate,
        COUNT(si.id) as item_count,
        COALESCE(SUM(si.taxable_amount), 0) as total_taxable,
        COALESCE(SUM(si.tax_amount), 0) as total_tax,
        COALESCE(SUM(si.tax_amount / 2), 0) as cgst,
        COALESCE(SUM(si.tax_amount / 2), 0) as sgst,
        COALESCE(SUM(si.total_amount), 0) as total_with_tax
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      ${whereClause}
      GROUP BY si.tax_rate
      ORDER BY si.tax_rate ASC
    `).all(...params) as any[];

    const totals = sqlite.prepare(`
      SELECT
        COALESCE(SUM(si.taxable_amount), 0) as grand_taxable,
        COALESCE(SUM(si.tax_amount), 0) as grand_tax,
        COALESCE(SUM(si.tax_amount / 2), 0) as grand_cgst,
        COALESCE(SUM(si.tax_amount / 2), 0) as grand_sgst,
        COALESCE(SUM(si.total_amount), 0) as grand_total
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      ${whereClause}
    `).get(...params) as any;

    return {
      taxSlabs,
      totals,
    };
  },

  getInventoryValuation() {
    const summary = sqlite.prepare(`
      SELECT
        COUNT(id) as total_products,
        COALESCE(SUM(current_stock), 0) as total_units,
        COALESCE(SUM(current_stock * purchase_rate), 0) as total_purchase_value,
        COALESCE(SUM(current_stock * selling_rate), 0) as total_selling_value,
        COALESCE(SUM(current_stock * mrp), 0) as total_mrp_value
      FROM products
      WHERE is_active = 1
    `).get() as any;

    const categoryValuation = sqlite.prepare(`
      SELECT
        category,
        COUNT(id) as product_count,
        COALESCE(SUM(current_stock), 0) as stock_quantity,
        COALESCE(SUM(current_stock * purchase_rate), 0) as purchase_value,
        COALESCE(SUM(current_stock * selling_rate), 0) as selling_value
      FROM products
      WHERE is_active = 1
      GROUP BY category
      ORDER BY selling_value DESC
    `).all() as any[];

    return {
      summary,
      categoryValuation,
    };
  },

  getCustomerOutstandingReport() {
    const customersWithBalance = sqlite.prepare(`
      SELECT
        id, name, mobile, village, taluk, farm_name, outstanding_balance, credit_limit,
        (SELECT MAX(sale_date) FROM sales WHERE customer_id = customers.id) as last_purchase_date,
        (SELECT MAX(payment_date) FROM payments WHERE customer_id = customers.id) as last_payment_date
      FROM customers
      WHERE outstanding_balance > 0
      ORDER BY outstanding_balance DESC
    `).all() as any[];

    const totalOutstanding = sqlite.prepare(`
      SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM customers
    `).get() as any;

    return {
      customers: customersWithBalance,
      totalOutstanding: totalOutstanding?.total || 0,
    };
  },
};
