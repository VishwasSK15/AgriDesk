import { sqlite } from '../db';
import { Sale, SaleItem, SaleStatus, PrintStatus, PaymentMethod } from '../types';

export const billingService = {
  getNextInvoiceNumber(): string {
    const settings = sqlite.prepare('SELECT invoice_prefix FROM store_settings WHERE id = 1').get() as any;
    const prefix = settings?.invoice_prefix || 'INV-';
    const year = new Date().getFullYear();
    const countRow = sqlite.prepare('SELECT COUNT(*) as count FROM sales').get() as any;
    const nextNum = (countRow?.count || 0) + 1;
    return `${prefix}${year}-${String(nextNum).padStart(4, '0')}`;
  },

  createSale(saleData: {
    customerId?: number;
    customerName: string;
    customerMobile?: string;
    customerAddress?: string;
    customerGstin?: string;
    customerVillage?: string;
    subtotal: number;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    totalDiscount: number;
    taxAmount: number;
    grandTotal: number;
    roundOff: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    balanceDue: number;
    notes?: string;
    items: Omit<SaleItem, 'id' | 'sale_id'>[];
    userId?: number;
  }): { success: boolean; sale?: Sale; error?: string } {
    const transaction = sqlite.transaction(() => {
      const invoiceNumber = billingService.getNextInvoiceNumber();
      const saleDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Validate items
      if (!saleData.items || saleData.items.length === 0) {
        throw new Error('Sale must contain at least one item');
      }

      // Insert sale
      const insertSaleStmt = sqlite.prepare(`
        INSERT INTO sales (
          invoice_number, customer_id, customer_name, customer_mobile,
          customer_address, customer_gstin, customer_village, sale_date,
          subtotal, discount_type, discount_value, total_discount,
          tax_amount, grand_total, round_off, payment_method,
          paid_amount, balance_due, notes, status, print_status, print_count, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const saleRes = insertSaleStmt.run(
        invoiceNumber,
        saleData.customerId || (saleData.customerName === 'Walk-in Customer' ? 1 : null),
        saleData.customerName,
        saleData.customerMobile || '',
        saleData.customerAddress || '',
        saleData.customerGstin || '',
        saleData.customerVillage || '',
        saleDate,
        saleData.subtotal,
        saleData.discountType,
        saleData.discountValue,
        saleData.totalDiscount,
        saleData.taxAmount,
        saleData.grandTotal,
        saleData.roundOff,
        saleData.paymentMethod,
        saleData.paidAmount,
        saleData.balanceDue,
        saleData.notes || '',
        'completed',
        'pending',
        0,
        saleData.userId || null
      );

      const saleId = Number(saleRes.lastInsertRowid);

      // Insert items and adjust stock
      const insertItemStmt = sqlite.prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, batch_id, product_name, batch_number,
          expiry_date, quantity, unit, rate, discount_amount,
          tax_rate, taxable_amount, tax_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateBatchStmt = sqlite.prepare(`
        UPDATE batches SET quantity = quantity - ? WHERE id = ?
      `);

      const updateProdStmt = sqlite.prepare(`
        UPDATE products SET current_stock = current_stock - ? WHERE id = ?
      `);

      const insertMovementStmt = sqlite.prepare(`
        INSERT INTO stock_movements (
          product_id, batch_id, product_name, batch_number,
          quantity_change, movement_type, reference_type, reference_id,
          reason, previous_stock, new_stock, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of saleData.items) {
        insertItemStmt.run(
          saleId,
          item.product_id,
          item.batch_id || null,
          item.product_name,
          item.batch_number || null,
          item.expiry_date || null,
          item.quantity,
          item.unit,
          item.rate,
          item.discount_amount || 0,
          item.tax_rate || 0,
          item.taxable_amount || 0,
          item.tax_amount || 0,
          item.total_amount
        );

        // Fetch current product stock
        const currentProd = sqlite.prepare('SELECT current_stock FROM products WHERE id = ?').get(item.product_id) as any;
        const prevStock = currentProd ? currentProd.current_stock : 0;
        const newStock = prevStock - item.quantity;

        // Reduce product stock
        updateProdStmt.run(item.quantity, item.product_id);

        // Reduce batch stock if batch specified
        if (item.batch_id) {
          updateBatchStmt.run(item.quantity, item.batch_id);
        }

        // Record stock movement
        insertMovementStmt.run(
          item.product_id,
          item.batch_id || null,
          item.product_name,
          item.batch_number || null,
          -item.quantity,
          'sale',
          'sale',
          saleId,
          `Sale Invoice ${invoiceNumber}`,
          prevStock,
          newStock,
          saleData.userId || null
        );
      }

      // Update customer balance if credit/partial payment
      const actualCustomerId = saleData.customerId || (saleData.customerName === 'Walk-in Customer' ? 1 : null);
      if (actualCustomerId && saleData.balanceDue > 0) {
        sqlite.prepare(`
          UPDATE customers
          SET outstanding_balance = outstanding_balance + ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(saleData.balanceDue, actualCustomerId);
      }

      // Record payment entry if paidAmount > 0
      if (saleData.paidAmount > 0) {
        sqlite.prepare(`
          INSERT INTO payments (
            customer_id, sale_id, type, amount, payment_method,
            reference_number, notes, payment_date, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          actualCustomerId,
          saleId,
          'sale_collection',
          saleData.paidAmount,
          saleData.paymentMethod,
          `Bill ${invoiceNumber}`,
          `Payment for Invoice ${invoiceNumber}`,
          saleDate,
          saleData.userId || null
        );
      }

      // Create print job (mandatory print workflow)
      sqlite.prepare(`
        INSERT INTO print_jobs (sale_id, invoice_number, print_type, status, attempts)
        VALUES (?, ?, ?, ?, ?)
      `).run(saleId, invoiceNumber, 'thermal_80', 'pending', 0);

      // Audit log
      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        saleData.userId || null,
        saleData.userId ? 'User' : 'Admin',
        'CREATE_SALE',
        'sales',
        String(saleId),
        `Finalized Sale ${invoiceNumber} for ₹${saleData.grandTotal} (${saleData.customerName})`
      );

      return saleId;
    });

    try {
      const saleId = transaction();
      const sale = billingService.getSaleById(saleId);
      return { success: true, sale: sale || undefined };
    } catch (err: any) {
      console.error('Error creating sale:', err);
      return { success: false, error: err.message };
    }
  },

  getSales(filters: {
    startDate?: string;
    endDate?: string;
    customerId?: number;
    searchQuery?: string;
    status?: string;
    paymentMethod?: string;
    limit?: number;
    offset?: number;
  }): { sales: Sale[]; totalCount: number } {
    let query = 'SELECT * FROM sales WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM sales WHERE 1=1';
    const params: any[] = [];
    const countParams: any[] = [];

    if (filters.startDate) {
      query += ' AND sale_date >= ?';
      countQuery += ' AND sale_date >= ?';
      params.push(filters.startDate);
      countParams.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND sale_date <= ?';
      countQuery += ' AND sale_date <= ?';
      params.push(filters.endDate + ' 23:59:59');
      countParams.push(filters.endDate + ' 23:59:59');
    }

    if (filters.customerId) {
      query += ' AND customer_id = ?';
      countQuery += ' AND customer_id = ?';
      params.push(filters.customerId);
      countParams.push(filters.customerId);
    }

    if (filters.status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(filters.status);
      countParams.push(filters.status);
    }

    if (filters.paymentMethod) {
      query += ' AND payment_method = ?';
      countQuery += ' AND payment_method = ?';
      params.push(filters.paymentMethod);
      countParams.push(filters.paymentMethod);
    }

    if (filters.searchQuery) {
      const term = `%${filters.searchQuery}%`;
      query += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_mobile LIKE ?)';
      countQuery += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_mobile LIKE ?)';
      params.push(term, term, term);
      countParams.push(term, term, term);
    }

    const totalRow = sqlite.prepare(countQuery).get(...countParams) as any;
    const totalCount = totalRow ? totalRow.total : 0;

    query += ' ORDER BY id DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const salesList = sqlite.prepare(query).all(...params) as Sale[];
    return { sales: salesList, totalCount };
  },

  getSaleById(id: number): Sale | null {
    const sale = sqlite.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale | undefined;
    if (!sale) return null;

    const items = sqlite.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as SaleItem[];
    sale.items = items;
    return sale;
  },

  getSaleByInvoice(invoiceNumber: string): Sale | null {
    const sale = sqlite.prepare('SELECT * FROM sales WHERE invoice_number = ?').get(invoiceNumber) as Sale | undefined;
    if (!sale) return null;

    const items = sqlite.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id) as SaleItem[];
    sale.items = items;
    return sale;
  },

  cancelSale(saleId: number, reason: string, userId?: number): { success: boolean; error?: string } {
    const transaction = sqlite.transaction(() => {
      const sale = sqlite.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as Sale | undefined;
      if (!sale) throw new Error('Sale not found');
      if (sale.status === 'cancelled') throw new Error('Sale is already cancelled');

      const items = sqlite.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId) as SaleItem[];

      const updateProdStmt = sqlite.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?');
      const updateBatchStmt = sqlite.prepare('UPDATE batches SET quantity = quantity + ? WHERE id = ?');
      const insertMovementStmt = sqlite.prepare(`
        INSERT INTO stock_movements (
          product_id, batch_id, product_name, batch_number,
          quantity_change, movement_type, reference_type, reference_id,
          reason, previous_stock, new_stock, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Reverse stock
      for (const item of items) {
        const currentProd = sqlite.prepare('SELECT current_stock FROM products WHERE id = ?').get(item.product_id) as any;
        const prevStock = currentProd ? currentProd.current_stock : 0;
        const newStock = prevStock + item.quantity;

        updateProdStmt.run(item.quantity, item.product_id);
        if (item.batch_id) {
          updateBatchStmt.run(item.quantity, item.batch_id);
        }

        insertMovementStmt.run(
          item.product_id,
          item.batch_id || null,
          item.product_name,
          item.batch_number || null,
          item.quantity,
          'return',
          'sale_cancellation',
          saleId,
          `Cancelled sale ${sale.invoice_number}: ${reason}`,
          prevStock,
          newStock,
          userId || null
        );
      }

      // Revert customer outstanding if there was a balance
      if (sale.customer_id && sale.balance_due > 0) {
        sqlite.prepare(`
          UPDATE customers
          SET outstanding_balance = MAX(0, outstanding_balance - ?), updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(sale.balance_due, sale.customer_id);
      }

      // Mark sale cancelled
      sqlite.prepare(`
        UPDATE sales
        SET status = 'cancelled', notes = coalesce(notes, '') || ' | Cancelled: ' || ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(reason, saleId);

      // Audit log
      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId || null,
        'User',
        'CANCEL_SALE',
        'sales',
        String(saleId),
        `Cancelled Sale ${sale.invoice_number}. Reason: ${reason}`
      );
    });

    try {
      transaction();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
