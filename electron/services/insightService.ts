import { sqlite } from '../db';
import { DashboardSummary, SalesInsightReport, InventoryInsightReport } from '../types';

export const insightService = {
  getDashboardSummary(): DashboardSummary {
    // Today's sales
    const todaySalesRow = sqlite.prepare(`
      SELECT
        COALESCE(SUM(grand_total), 0) as total,
        COUNT(id) as count,
        COALESCE(SUM(paid_amount), 0) as collected
      FROM sales
      WHERE date(sale_date) = date('now', 'localtime') AND status != 'cancelled'
    `).get() as any;

    const todayCollectionsRow = sqlite.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE date(payment_date) = date('now', 'localtime')
    `).get() as any;

    const totalOutstandingRow = sqlite.prepare(`
      SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM customers
    `).get() as any;

    const inventoryValueRow = sqlite.prepare(`
      SELECT COALESCE(SUM(current_stock * purchase_rate), 0) as total FROM products WHERE is_active = 1
    `).get() as any;

    const lowStockRow = sqlite.prepare(`
      SELECT COUNT(id) as count FROM products WHERE is_active = 1 AND current_stock > 0 AND current_stock <= min_stock
    `).get() as any;

    const outOfStockRow = sqlite.prepare(`
      SELECT COUNT(id) as count FROM products WHERE is_active = 1 AND current_stock <= 0
    `).get() as any;

    const expiringRow = sqlite.prepare(`
      SELECT COUNT(id) as count FROM batches
      WHERE quantity > 0 AND is_active = 1 AND expiry_date IS NOT NULL
      AND date(expiry_date) <= date('now', '+60 days')
    `).get() as any;

    const recentSales = sqlite.prepare(`
      SELECT * FROM sales ORDER BY id DESC LIMIT 5
    `).all() as any[];

    const topProductsToday = sqlite.prepare(`
      SELECT
        si.product_name,
        COALESCE(SUM(si.quantity), 0) as quantity,
        COALESCE(SUM(si.total_amount), 0) as amount
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE date(s.sale_date) = date('now', 'localtime') AND s.status != 'cancelled'
      GROUP BY si.product_id, si.product_name
      ORDER BY amount DESC
      LIMIT 5
    `).all() as any[];

    // Generate alerts
    const highPriorityAlerts: DashboardSummary['highPriorityAlerts'] = [];

    if (outOfStockRow?.count > 0) {
      highPriorityAlerts.push({
        id: 'out-of-stock-alert',
        type: 'stock',
        title: `${outOfStockRow.count} Product(s) Out of Stock`,
        message: 'Customers cannot purchase these products until stock is replenished.',
        severity: 'danger',
      });
    }

    if (lowStockRow?.count > 0) {
      highPriorityAlerts.push({
        id: 'low-stock-alert',
        type: 'stock',
        title: `${lowStockRow.count} Product(s) Below Reorder Level`,
        message: 'Current stock has fallen below minimum safety threshold.',
        severity: 'warning',
      });
    }

    if (expiringRow?.count > 0) {
      highPriorityAlerts.push({
        id: 'expiring-alert',
        type: 'expiry',
        title: `${expiringRow.count} Batch(es) Approaching Expiry`,
        message: 'Stock is expiring within 60 days. Prioritize sales via FEFO.',
        severity: 'warning',
      });
    }

    // Concise insight summary text
    let summaryText = '';
    const todayTotal = todaySalesRow?.total || 0;
    const billsCount = todaySalesRow?.count || 0;

    if (billsCount === 0) {
      summaryText = 'No bills finalized yet today. Store inventory is ready for billing counter operations.';
    } else {
      summaryText = `Today's sales stand at ₹${todayTotal.toLocaleString('en-IN')} across ${billsCount} bill(s).`;
      if (lowStockRow?.count > 0) {
        summaryText += ` Note that ${lowStockRow.count} product(s) are below reorder level.`;
      }
      if (expiringRow?.count > 0) {
        summaryText += ` ${expiringRow.count} batch(es) approach expiry within 60 days.`;
      }
    }

    return {
      todaySales: todaySalesRow?.total || 0,
      billsTodayCount: todaySalesRow?.count || 0,
      todayCollections: todayCollectionsRow?.total || 0,
      totalCustomerOutstanding: totalOutstandingRow?.total || 0,
      currentInventoryValue: inventoryValueRow?.total || 0,
      lowStockCount: lowStockRow?.count || 0,
      expiringStockCount: expiringRow?.count || 0,
      outOfStockCount: outOfStockRow?.count || 0,
      recentSales,
      topProductsToday,
      highPriorityAlerts,
      conciseInsightSummary: summaryText,
    };
  },

  getSalesInsights(period: 'today' | 'week' | 'month' | 'year' = 'month'): SalesInsightReport {
    let currentStartSql = "date('now', 'start of month', 'localtime')";
    let currentEndSql = "date('now', 'localtime')";
    let prevStartSql = "date('now', 'start of month', '-1 month', 'localtime')";
    let prevEndSql = "date('now', 'start of month', '-1 day', 'localtime')";

    if (period === 'today') {
      currentStartSql = "date('now', 'localtime')";
      currentEndSql = "date('now', 'localtime')";
      prevStartSql = "date('now', '-1 day', 'localtime')";
      prevEndSql = "date('now', '-1 day', 'localtime')";
    } else if (period === 'week') {
      currentStartSql = "date('now', '-6 days', 'localtime')";
      currentEndSql = "date('now', 'localtime')";
      prevStartSql = "date('now', '-13 days', 'localtime')";
      prevEndSql = "date('now', '-7 days', 'localtime')";
    } else if (period === 'year') {
      currentStartSql = "date('now', 'start of year', 'localtime')";
      currentEndSql = "date('now', 'localtime')";
      prevStartSql = "date('now', 'start of year', '-1 year', 'localtime')";
      prevEndSql = "date('now', 'start of year', '-1 day', 'localtime')";
    }

    // Current period metrics
    const currentMetrics = sqlite.prepare(`
      SELECT
        COALESCE(SUM(grand_total), 0) as total_sales,
        COUNT(id) as bill_count,
        COALESCE(AVG(grand_total), 0) as avg_bill,
        COALESCE(SUM(total_discount), 0) as total_discount,
        COALESCE(SUM(paid_amount), 0) as paid_amount,
        COALESCE(SUM(balance_due), 0) as credit_amount
      FROM sales
      WHERE date(sale_date) >= ${currentStartSql} AND date(sale_date) <= ${currentEndSql} AND status != 'cancelled'
    `).get() as any;

    // Previous period metrics
    const prevMetrics = sqlite.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total_sales
      FROM sales
      WHERE date(sale_date) >= ${prevStartSql} AND date(sale_date) <= ${prevEndSql} AND status != 'cancelled'
    `).get() as any;

    const currentSales = currentMetrics?.total_sales || 0;
    const previousSales = prevMetrics?.total_sales || 0;
    const billCount = currentMetrics?.bill_count || 0;

    let growthPercent = 0;
    if (previousSales > 0) {
      growthPercent = Math.round(((currentSales - previousSales) / previousSales) * 100);
    } else if (currentSales > 0) {
      growthPercent = 100;
    }

    // Total quantity sold
    const qtyRow = sqlite.prepare(`
      SELECT COALESCE(SUM(si.quantity), 0) as total_qty
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE date(s.sale_date) >= ${currentStartSql} AND date(s.sale_date) <= ${currentEndSql} AND s.status != 'cancelled'
    `).get() as any;

    // Top products
    const topProducts = sqlite.prepare(`
      SELECT
        si.product_id,
        si.product_name as name,
        COALESCE(p.category, 'General') as category,
        COALESCE(SUM(si.quantity), 0) as quantity,
        COALESCE(SUM(si.total_amount), 0) as revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE date(s.sale_date) >= ${currentStartSql} AND date(s.sale_date) <= ${currentEndSql} AND s.status != 'cancelled'
      GROUP BY si.product_id, si.product_name, p.category
      ORDER BY revenue DESC
      LIMIT 5
    `).all() as any[];

    // Category breakdown
    const categoryRows = sqlite.prepare(`
      SELECT
        COALESCE(p.category, 'Other') as category,
        COALESCE(SUM(si.total_amount), 0) as revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE date(s.sale_date) >= ${currentStartSql} AND date(s.sale_date) <= ${currentEndSql} AND s.status != 'cancelled'
      GROUP BY p.category
      ORDER BY revenue DESC
    `).all() as any[];

    const categoryShare = categoryRows.map((c) => ({
      category: c.category,
      revenue: c.revenue,
      percentage: currentSales > 0 ? Math.round((c.revenue / currentSales) * 100) : 0,
    }));

    // Payment methods
    const paymentRows = sqlite.prepare(`
      SELECT payment_method as method, COALESCE(SUM(grand_total), 0) as amount
      FROM sales
      WHERE date(sale_date) >= ${currentStartSql} AND date(sale_date) <= ${currentEndSql} AND status != 'cancelled'
      GROUP BY payment_method
      ORDER BY amount DESC
    `).all() as any[];

    const paymentSplit = paymentRows.map((p) => ({
      method: p.method.toUpperCase(),
      amount: p.amount,
      percentage: currentSales > 0 ? Math.round((p.amount / currentSales) * 100) : 0,
    }));

    const paidAmount = currentMetrics?.paid_amount || 0;
    const creditAmount = currentMetrics?.credit_amount || 0;
    const creditPercent = currentSales > 0 ? Math.round((creditAmount / currentSales) * 100) : 0;

    // Build explainable natural language insight statements
    const insightsText: string[] = [];
    const hasEnoughData = billCount >= 1;

    if (!hasEnoughData) {
      insightsText.push('Not enough historical sales data in this period to identify a reliable trend.');
    } else {
      if (previousSales > 0) {
        if (growthPercent > 0) {
          insightsText.push(`Sales grew by ${growthPercent}% compared with the previous comparable period (₹${currentSales.toLocaleString('en-IN')} vs ₹${previousSales.toLocaleString('en-IN')}).`);
        } else if (growthPercent < 0) {
          insightsText.push(`Sales declined by ${Math.abs(growthPercent)}% compared with the previous comparable period.`);
        } else {
          insightsText.push(`Sales are on par with the previous comparable period.`);
        }
      } else {
        insightsText.push(`Total revenue recorded is ₹${currentSales.toLocaleString('en-IN')} across ${billCount} invoice(s).`);
      }

      if (categoryShare.length > 0) {
        const topCat = categoryShare[0];
        insightsText.push(`${topCat.category} contributed the largest share of sales (${topCat.percentage}% of total revenue).`);
      }

      if (topProducts.length > 0) {
        const topProd = topProducts[0];
        insightsText.push(`'${topProd.name}' is the highest revenue generator, contributing ₹${topProd.revenue.toLocaleString('en-IN')}.`);
      }

      if (creditPercent > 20) {
        insightsText.push(`Credit sales represent ${creditPercent}% of total billing for this period. Monitor customer outstanding balances closely.`);
      } else {
        insightsText.push(`Cash/UPI collections accounted for ${100 - creditPercent}% of sales, maintaining healthy counter liquidity.`);
      }
    }

    return {
      period,
      currentSales,
      previousSales,
      salesGrowthPercent: growthPercent,
      invoicesCount: billCount,
      averageBillValue: Math.round(currentMetrics?.avg_bill || 0),
      totalQuantitySold: qtyRow?.total_qty || 0,
      totalDiscountsGiven: currentMetrics?.total_discount || 0,
      topProducts,
      categoryShare,
      paymentSplit,
      creditVsPaid: {
        paidAmount,
        creditAmount,
        creditPercent,
      },
      hasEnoughData,
      insightsText,
    };
  },

  getInventoryInsights(): InventoryInsightReport {
    const valuationRow = sqlite.prepare(`
      SELECT
        COUNT(id) as total_products,
        COALESCE(SUM(current_stock * purchase_rate), 0) as total_value
      FROM products
      WHERE is_active = 1
    `).get() as any;

    const outOfStockRow = sqlite.prepare(`
      SELECT COUNT(id) as count FROM products WHERE is_active = 1 AND current_stock <= 0
    `).get() as any;

    // Low stock items
    const lowStockItems = sqlite.prepare(`
      SELECT id as product_id, name, current_stock, min_stock, unit
      FROM products
      WHERE is_active = 1 AND current_stock <= min_stock
      ORDER BY current_stock ASC
      LIMIT 10
    `).all() as any[];

    // Expiring items (within 90 days)
    const expiringItems = sqlite.prepare(`
      SELECT
        b.id as batch_id,
        p.name as product_name,
        b.batch_number,
        b.quantity,
        b.expiry_date,
        CAST((julianday(b.expiry_date) - julianday('now')) AS INTEGER) as days_left
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.quantity > 0 AND b.is_active = 1 AND b.expiry_date IS NOT NULL
      AND date(b.expiry_date) <= date('now', '+90 days')
      ORDER BY date(b.expiry_date) ASC
      LIMIT 10
    `).all() as any[];

    // Fast moving items (last 30 days)
    const fastMovingItems = sqlite.prepare(`
      SELECT
        si.product_id,
        si.product_name as name,
        COALESCE(SUM(si.quantity), 0) as quantity_sold,
        p.current_stock
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE date(s.sale_date) >= date('now', '-30 days') AND s.status != 'cancelled'
      GROUP BY si.product_id, si.product_name, p.current_stock
      ORDER BY quantity_sold DESC
      LIMIT 5
    `).all() as any[];

    // Slow moving items (products with stock but 0 sales in last 30 days)
    const slowMovingItems = sqlite.prepare(`
      SELECT
        p.id as product_id,
        p.name,
        p.current_stock,
        30 as days_without_sale
      FROM products p
      WHERE p.is_active = 1 AND p.current_stock > 10
      AND p.id NOT IN (
        SELECT DISTINCT si.product_id
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE date(s.sale_date) >= date('now', '-30 days') AND s.status != 'cancelled'
      )
      ORDER BY p.current_stock DESC
      LIMIT 5
    `).all() as any[];

    // Reorder suggestions (based on stock < min_stock)
    const reorderSuggestions = lowStockItems.map((item) => {
      const suggested_qty = Math.max(item.min_stock * 2 - item.current_stock, item.min_stock);
      return {
        product_id: item.product_id,
        name: item.name,
        current_stock: item.current_stock,
        min_stock: item.min_stock,
        suggested_qty,
        reason: item.current_stock <= 0
          ? 'Stock completely exhausted; urgent procurement needed.'
          : `Current stock (${item.current_stock}) is below reorder threshold (${item.min_stock}).`,
      };
    });

    const insightsText: string[] = [];
    const hasEnoughData = (valuationRow?.total_products || 0) > 0;

    if (!hasEnoughData) {
      insightsText.push('No product inventory records found. Add products to generate inventory insights.');
    } else {
      if (lowStockItems.length > 0) {
        insightsText.push(`${lowStockItems.length} product(s) are below their reorder level and require purchase orders.`);
      } else {
        insightsText.push('All active products maintain stock levels above their configured reorder thresholds.');
      }

      if (expiringItems.length > 0) {
        const urgent = expiringItems.filter((e) => e.days_left <= 30);
        if (urgent.length > 0) {
          insightsText.push(`Critical: ${urgent.length} batch(es) expire within 30 days. Prioritize them on the counter using FEFO.`);
        } else {
          insightsText.push(`${expiringItems.length} batch(es) are approaching expiry within the next 90 days.`);
        }
      } else {
        insightsText.push('No batches are approaching expiry within the next 90 days.');
      }

      if (fastMovingItems.length > 0) {
        insightsText.push(`'${fastMovingItems[0].name}' has the highest sales velocity over the past 30 days.`);
      }

      if (slowMovingItems.length > 0) {
        insightsText.push(`${slowMovingItems.length} product(s) have recorded zero sales in the past 30 days despite holding inventory.`);
      }
    }

    return {
      totalStockValue: valuationRow?.total_value || 0,
      activeProductsCount: valuationRow?.total_products || 0,
      outOfStockCount: outOfStockRow?.count || 0,
      lowStockItems,
      expiringItems,
      fastMovingItems,
      slowMovingItems,
      reorderSuggestions,
      hasEnoughData,
      insightsText,
    };
  },
};
