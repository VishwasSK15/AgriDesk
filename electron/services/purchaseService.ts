import { sqlite } from '../db';
import { Purchase, PurchaseItem } from '../types';

export const purchaseService = {
  createPurchase(data: {
    invoiceNumber: string;
    supplierId: number;
    purchaseDate: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    paymentStatus: 'paid' | 'partial' | 'due';
    notes?: string;
    items: Omit<PurchaseItem, 'id' | 'purchase_id'>[];
    userId?: number;
  }): { success: boolean; purchase?: Purchase; error?: string } {
    const transaction = sqlite.transaction(() => {
      const supplier = sqlite.prepare('SELECT name FROM suppliers WHERE id = ?').get(data.supplierId) as any;
      if (!supplier) throw new Error('Supplier not found');

      if (!data.items || data.items.length === 0) {
        throw new Error('Purchase must contain at least one item');
      }

      // Insert purchase
      const res = sqlite.prepare(`
        INSERT INTO purchases (
          invoice_number, supplier_id, supplier_name, purchase_date,
          subtotal, tax_amount, discount_amount, total_amount,
          paid_amount, balance_due, payment_status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.invoiceNumber,
        data.supplierId,
        supplier.name,
        data.purchaseDate,
        data.subtotal,
        data.taxAmount,
        data.discountAmount,
        data.totalAmount,
        data.paidAmount,
        data.balanceDue,
        data.paymentStatus,
        data.notes || '',
        data.userId || null
      );

      const purchaseId = Number(res.lastInsertRowid);

      const insertItemStmt = sqlite.prepare(`
        INSERT INTO purchase_items (
          purchase_id, product_id, product_name, batch_number,
          mfg_date, expiry_date, quantity, unit, purchase_rate,
          mrp, selling_rate, tax_rate, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateProdStockStmt = sqlite.prepare(`
        UPDATE products SET
          current_stock = current_stock + ?,
          purchase_rate = ?,
          selling_rate = ?,
          mrp = ?,
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `);

      const insertMovementStmt = sqlite.prepare(`
        INSERT INTO stock_movements (
          product_id, batch_id, product_name, batch_number,
          quantity_change, movement_type, reference_type, reference_id,
          reason, previous_stock, new_stock, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of data.items) {
        insertItemStmt.run(
          purchaseId,
          item.product_id,
          item.product_name || 'Product',
          item.batch_number,
          item.mfg_date || null,
          item.expiry_date || null,
          item.quantity,
          item.unit,
          item.purchase_rate,
          item.mrp,
          item.selling_rate,
          item.tax_rate,
          item.total_amount
        );

        // Fetch current product stock
        const currentProd = sqlite.prepare('SELECT current_stock, name FROM products WHERE id = ?').get(item.product_id) as any;
        const prevStock = currentProd ? currentProd.current_stock : 0;
        const newStock = prevStock + item.quantity;

        // Upsert batch
        let batchId: number;
        const existingBatch = sqlite.prepare(`
          SELECT id, quantity FROM batches WHERE product_id = ? AND batch_number = ?
        `).get(item.product_id, item.batch_number) as any;

        if (existingBatch) {
          sqlite.prepare(`
            UPDATE batches SET
              quantity = quantity + ?,
              purchase_rate = ?,
              mrp = ?,
              selling_rate = ?,
              mfg_date = COALESCE(?, mfg_date),
              expiry_date = COALESCE(?, expiry_date)
            WHERE id = ?
          `).run(
            item.quantity,
            item.purchase_rate,
            item.mrp,
            item.selling_rate,
            item.mfg_date || null,
            item.expiry_date || null,
            existingBatch.id
          );
          batchId = existingBatch.id;
        } else {
          const batchRes = sqlite.prepare(`
            INSERT INTO batches (
              product_id, batch_number, mfg_date, expiry_date,
              quantity, purchase_rate, mrp, selling_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            item.product_id,
            item.batch_number,
            item.mfg_date || null,
            item.expiry_date || null,
            item.quantity,
            item.purchase_rate,
            item.mrp,
            item.selling_rate
          );
          batchId = Number(batchRes.lastInsertRowid);
        }

        // Increase product stock & update latest rates
        updateProdStockStmt.run(item.quantity, item.purchase_rate, item.selling_rate, item.mrp, item.product_id);

        // Record stock movement
        insertMovementStmt.run(
          item.product_id,
          batchId,
          item.product_name || (currentProd ? currentProd.name : ''),
          item.batch_number,
          item.quantity,
          'purchase',
          'purchase',
          purchaseId,
          `Purchase invoice ${data.invoiceNumber} from ${supplier.name}`,
          prevStock,
          newStock,
          data.userId || null
        );
      }

      // Update supplier balance if balance due
      if (data.balanceDue > 0) {
        sqlite.prepare(`
          UPDATE suppliers
          SET outstanding_balance = outstanding_balance + ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(data.balanceDue, data.supplierId);
      }

      // Record payment entry if paid amount > 0
      if (data.paidAmount > 0) {
        sqlite.prepare(`
          INSERT INTO payments (
            supplier_id, purchase_id, type, amount, payment_method,
            reference_number, notes, payment_date, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          data.supplierId,
          purchaseId,
          'supplier_payment',
          data.paidAmount,
          'bank_transfer',
          `PUR-${data.invoiceNumber}`,
          `Payment for purchase invoice ${data.invoiceNumber}`,
          data.purchaseDate,
          data.userId || null
        );
      }

      // Audit log
      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.userId || null,
        'User',
        'CREATE_PURCHASE',
        'purchases',
        String(purchaseId),
        `Recorded purchase ${data.invoiceNumber} of ₹${data.totalAmount} from ${supplier.name}`
      );

      return purchaseId;
    });

    try {
      const pid = transaction();
      const p = purchaseService.getPurchaseById(pid);
      return { success: true, purchase: p || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getPurchases(filters?: { supplierId?: number; startDate?: string; endDate?: string }): Purchase[] {
    let query = 'SELECT * FROM purchases WHERE 1=1';
    const params: any[] = [];

    if (filters?.supplierId) {
      query += ' AND supplier_id = ?';
      params.push(filters.supplierId);
    }
    if (filters?.startDate) {
      query += ' AND purchase_date >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ' AND purchase_date <= ?';
      params.push(filters.endDate + ' 23:59:59');
    }

    query += ' ORDER BY id DESC';
    return sqlite.prepare(query).all(...params) as Purchase[];
  },

  getPurchaseById(id: number): Purchase | null {
    const p = sqlite.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as Purchase | undefined;
    if (!p) return null;

    const items = sqlite.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(id) as PurchaseItem[];
    p.items = items;
    return p;
  },
};
