import { sqlite } from '../db';
import { Customer, Payment, PaymentMethod } from '../types';

export const customerService = {
  getCustomers(searchQuery?: string): Customer[] {
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (searchQuery) {
      const term = `%${searchQuery}%`;
      query += ' AND (name LIKE ? OR mobile LIKE ? OR village LIKE ? OR gstin LIKE ? OR farm_name LIKE ?)';
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY name ASC';
    return sqlite.prepare(query).all(...params) as Customer[];
  },

  getCustomerById(id: number): Customer | null {
    return (sqlite.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer) || null;
  },

  createCustomer(data: Omit<Customer, 'id' | 'outstanding_balance' | 'created_at' | 'updated_at'> & { openingBalance?: number }, userId?: number): { success: boolean; customer?: Customer; error?: string } {
    try {
      const existing = sqlite.prepare("SELECT id FROM customers WHERE mobile = ? AND mobile != '0000000000'").get(data.mobile);
      if (existing) {
        return { success: false, error: 'A customer with this mobile number already exists' };
      }

      const openingBal = Number(data.openingBalance) || 0;

      const res = sqlite.prepare(`
        INSERT INTO customers (
          name, mobile, alternate_mobile, address, village, taluk,
          district, state, pincode, gstin, farm_name, farm_size,
          crop_info, outstanding_balance, credit_limit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.mobile,
        data.alternate_mobile || '',
        data.address || '',
        data.village || '',
        data.taluk || '',
        data.district || '',
        data.state || 'Karnataka',
        data.pincode || '',
        data.gstin || '',
        data.farm_name || '',
        data.farm_size || '',
        data.crop_info || '',
        openingBal,
        data.credit_limit || 50000
      );

      const customerId = Number(res.lastInsertRowid);

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId || null, 'User', 'CREATE_CUSTOMER', 'customers', String(customerId), `Created customer ${data.name} (${data.mobile})`);

      const customer = customerService.getCustomerById(customerId);
      return { success: true, customer: customer || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateCustomer(id: number, data: Partial<Customer>, userId?: number): { success: boolean; customer?: Customer; error?: string } {
    try {
      sqlite.prepare(`
        UPDATE customers SET
          name = COALESCE(?, name),
          mobile = COALESCE(?, mobile),
          alternate_mobile = COALESCE(?, alternate_mobile),
          address = COALESCE(?, address),
          village = COALESCE(?, village),
          taluk = COALESCE(?, taluk),
          district = COALESCE(?, district),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode),
          gstin = COALESCE(?, gstin),
          farm_name = COALESCE(?, farm_name),
          farm_size = COALESCE(?, farm_size),
          crop_info = COALESCE(?, crop_info),
          credit_limit = COALESCE(?, credit_limit),
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        data.name ?? null,
        data.mobile ?? null,
        data.alternate_mobile ?? null,
        data.address ?? null,
        data.village ?? null,
        data.taluk ?? null,
        data.district ?? null,
        data.state ?? null,
        data.pincode ?? null,
        data.gstin ?? null,
        data.farm_name ?? null,
        data.farm_size ?? null,
        data.crop_info ?? null,
        data.credit_limit ?? null,
        id
      );

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId || null, 'User', 'UPDATE_CUSTOMER', 'customers', String(id), `Updated customer ${data.name || id}`);

      const customer = customerService.getCustomerById(id);
      return { success: true, customer: customer || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getCustomerLedger(customerId: number): {
    entries: {
      date: string;
      type: 'INVOICE' | 'PAYMENT';
      reference: string;
      debit: number; // Sale amount added to outstanding
      credit: number; // Payment received reducing outstanding
      balance: number;
      notes: string;
    }[];
    totalPurchases: number;
    totalPaid: number;
    currentBalance: number;
  } {
    // Fetch sales and payments
    const salesList = sqlite.prepare(`
      SELECT sale_date as date, invoice_number as reference, grand_total, balance_due, notes
      FROM sales
      WHERE customer_id = ? AND status != 'cancelled'
      ORDER BY sale_date ASC
    `).all(customerId) as any[];

    const paymentsList = sqlite.prepare(`
      SELECT payment_date as date, reference_number as reference, amount, payment_method, notes
      FROM payments
      WHERE customer_id = ?
      ORDER BY payment_date ASC
    `).all(customerId) as any[];

    // Merge chronologically
    const allEvents: any[] = [];
    salesList.forEach((s) => {
      allEvents.push({
        date: s.date,
        type: 'INVOICE' as const,
        reference: s.reference,
        debit: s.grand_total,
        credit: 0,
        notes: s.notes || 'Goods Sold',
      });
    });

    paymentsList.forEach((p) => {
      allEvents.push({
        date: p.date,
        type: 'PAYMENT' as const,
        reference: p.reference || 'Payment Receipt',
        debit: 0,
        credit: p.amount,
        notes: `Received via ${p.payment_method.toUpperCase()} ${p.notes ? '- ' + p.notes : ''}`,
      });
    });

    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    let totalPurchases = 0;
    let totalPaid = 0;

    const entries = allEvents.map((evt) => {
      runningBalance += evt.debit - evt.credit;
      totalPurchases += evt.debit;
      totalPaid += evt.credit;
      return {
        date: evt.date,
        type: evt.type,
        reference: evt.reference,
        debit: evt.debit,
        credit: evt.credit,
        balance: Math.round(runningBalance * 100) / 100,
        notes: evt.notes,
      };
    });

    const cust = customerService.getCustomerById(customerId);

    return {
      entries,
      totalPurchases,
      totalPaid,
      currentBalance: cust ? cust.outstanding_balance : runningBalance,
    };
  },

  collectPayment(data: {
    customerId: number;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
    userId?: number;
  }): { success: boolean; payment?: Payment; error?: string } {
    const transaction = sqlite.transaction(() => {
      const cust = sqlite.prepare('SELECT name, outstanding_balance FROM customers WHERE id = ?').get(data.customerId) as any;
      if (!cust) throw new Error('Customer not found');

      if (data.amount <= 0) throw new Error('Payment amount must be greater than zero');

      const paymentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // Record payment
      const pRes = sqlite.prepare(`
        INSERT INTO payments (
          customer_id, type, amount, payment_method,
          reference_number, notes, payment_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.customerId,
        'customer_payment',
        data.amount,
        data.paymentMethod,
        data.referenceNumber || `RCPT-${Date.now().toString().slice(-6)}`,
        data.notes || 'Balance payment collection',
        paymentDate,
        data.userId || null
      );

      // Reduce outstanding balance
      sqlite.prepare(`
        UPDATE customers
        SET outstanding_balance = MAX(0, outstanding_balance - ?), updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(data.amount, data.customerId);

      // Audit log
      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.userId || null,
        'User',
        'COLLECT_PAYMENT',
        'payments',
        String(pRes.lastInsertRowid),
        `Collected ₹${data.amount} from ${cust.name} via ${data.paymentMethod}`
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
