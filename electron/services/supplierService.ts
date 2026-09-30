import { sqlite } from '../db';
import { Supplier, Payment, PaymentMethod } from '../types';

export const supplierService = {
  getSuppliers(searchQuery?: string): Supplier[] {
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params: any[] = [];

    if (searchQuery) {
      const term = `%${searchQuery}%`;
      query += ' AND (name LIKE ? OR mobile LIKE ? OR gstin LIKE ? OR license_info LIKE ?)';
      params.push(term, term, term, term);
    }

    query += ' ORDER BY name ASC';
    return sqlite.prepare(query).all(...params) as Supplier[];
  },

  getSupplierById(id: number): Supplier | null {
    return (sqlite.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier) || null;
  },

  createSupplier(data: Omit<Supplier, 'id' | 'outstanding_balance' | 'created_at' | 'updated_at'>, userId?: number): { success: boolean; supplier?: Supplier; error?: string } {
    try {
      const res = sqlite.prepare(`
        INSERT INTO suppliers (
          name, mobile, email, address, gstin, license_info,
          payment_terms, outstanding_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        data.name,
        data.mobile,
        data.email || '',
        data.address || '',
        data.gstin || '',
        data.license_info || '',
        data.payment_terms || '30 Days Net'
      );

      const supplierId = Number(res.lastInsertRowid);

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId || null, 'User', 'CREATE_SUPPLIER', 'suppliers', String(supplierId), `Created supplier ${data.name}`);

      const supplier = supplierService.getSupplierById(supplierId);
      return { success: true, supplier: supplier || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateSupplier(id: number, data: Partial<Supplier>, userId?: number): { success: boolean; supplier?: Supplier; error?: string } {
    try {
      sqlite.prepare(`
        UPDATE suppliers SET
          name = COALESCE(?, name),
          mobile = COALESCE(?, mobile),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          gstin = COALESCE(?, gstin),
          license_info = COALESCE(?, license_info),
          payment_terms = COALESCE(?, payment_terms),
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        data.name ?? null,
        data.mobile ?? null,
        data.email ?? null,
        data.address ?? null,
        data.gstin ?? null,
        data.license_info ?? null,
        data.payment_terms ?? null,
        id
      );

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId || null, 'User', 'UPDATE_SUPPLIER', 'suppliers', String(id), `Updated supplier ${data.name || id}`);

      const supplier = supplierService.getSupplierById(id);
      return { success: true, supplier: supplier || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  recordSupplierPayment(data: {
    supplierId: number;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
    userId?: number;
  }): { success: boolean; payment?: Payment; error?: string } {
    const transaction = sqlite.transaction(() => {
      const sup = sqlite.prepare('SELECT name, outstanding_balance FROM suppliers WHERE id = ?').get(data.supplierId) as any;
      if (!sup) throw new Error('Supplier not found');

      const paymentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const pRes = sqlite.prepare(`
        INSERT INTO payments (
          supplier_id, type, amount, payment_method,
          reference_number, notes, payment_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.supplierId,
        'supplier_payment',
        data.amount,
        data.paymentMethod,
        data.referenceNumber || `SUP-PAY-${Date.now().toString().slice(-6)}`,
        data.notes || 'Payment to supplier',
        paymentDate,
        data.userId || null
      );

      sqlite.prepare(`
        UPDATE suppliers
        SET outstanding_balance = MAX(0, outstanding_balance - ?), updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(data.amount, data.supplierId);

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.userId || null,
        'User',
        'SUPPLIER_PAYMENT',
        'payments',
        String(pRes.lastInsertRowid),
        `Paid ₹${data.amount} to supplier ${sup.name} via ${data.paymentMethod}`
      );

      return Number(pRes.lastInsertRowid);
    });

    try {
      const paymentId = transaction();
      const payment = sqlite.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as Payment;
      return { success: true, payment };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
