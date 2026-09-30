import { sqlite } from '../db';
import { Product, Batch, StockMovement } from '../types';

export const inventoryService = {
  getProducts(filters?: {
    category?: string;
    searchQuery?: string;
    stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring';
    isActive?: boolean;
  }): Product[] {
    let query = `
      SELECT p.*,
        COALESCE((SELECT json_group_array(json_object(
          'id', b.id,
          'product_id', b.product_id,
          'batch_number', b.batch_number,
          'mfg_date', b.mfg_date,
          'expiry_date', b.expiry_date,
          'quantity', b.quantity,
          'purchase_rate', b.purchase_rate,
          'mrp', b.mrp,
          'selling_rate', b.selling_rate,
          'is_active', b.is_active,
          'created_at', b.created_at
        )) FROM batches b WHERE b.product_id = p.id AND b.quantity > 0 AND b.is_active = 1), '[]') as batches_json
      FROM products p
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.isActive !== undefined) {
      query += ' AND p.is_active = ?';
      params.push(filters.isActive ? 1 : 0);
    } else {
      query += ' AND p.is_active = 1';
    }

    if (filters?.category && filters.category !== 'All') {
      query += ' AND p.category = ?';
      params.push(filters.category);
    }

    if (filters?.searchQuery) {
      const term = `%${filters.searchQuery}%`;
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ? OR p.active_ingredient LIKE ?)';
      params.push(term, term, term, term, term);
    }

    if (filters?.stockStatus === 'out_of_stock') {
      query += ' AND p.current_stock <= 0';
    } else if (filters?.stockStatus === 'low_stock') {
      query += ' AND p.current_stock > 0 AND p.current_stock <= p.min_stock';
    } else if (filters?.stockStatus === 'in_stock') {
      query += ' AND p.current_stock > p.min_stock';
    } else if (filters?.stockStatus === 'expiring') {
      query += ` AND p.id IN (
        SELECT product_id FROM batches
        WHERE quantity > 0 AND expiry_date IS NOT NULL
        AND date(expiry_date) <= date('now', '+60 days')
      )`;
    }

    query += ' ORDER BY p.name ASC';

    const rows = sqlite.prepare(query).all(...params) as any[];

    return rows.map((r) => {
      let batches: Batch[] = [];
      try {
        batches = JSON.parse(r.batches_json);
      } catch {
        batches = [];
      }
      return {
        id: r.id,
        name: r.name,
        sku: r.sku,
        barcode: r.barcode,
        category: r.category,
        subcategory: r.subcategory,
        brand: r.brand,
        manufacturer: r.manufacturer,
        unit: r.unit,
        hsn_sac: r.hsn_sac,
        purchase_rate: r.purchase_rate,
        selling_rate: r.selling_rate,
        mrp: r.mrp,
        default_discount: r.default_discount,
        tax_rate: r.tax_rate,
        current_stock: r.current_stock,
        min_stock: r.min_stock,
        max_stock: r.max_stock,
        active_ingredient: r.active_ingredient,
        pack_size: r.pack_size,
        notes: r.notes,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
        batches,
      };
    });
  },

  getProductById(id: number): Product | null {
    const p = sqlite.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!p) return null;

    const batches = sqlite.prepare(`
      SELECT * FROM batches WHERE product_id = ? ORDER BY date(expiry_date) ASC, id ASC
    `).all(id) as Batch[];

    return {
      ...p,
      batches,
    };
  },

  createProduct(data: {
    name: string;
    sku: string;
    barcode?: string;
    category: string;
    subcategory?: string;
    brand?: string;
    manufacturer?: string;
    unit: string;
    hsn_sac?: string;
    purchase_rate: number;
    selling_rate: number;
    mrp: number;
    default_discount?: number;
    tax_rate: number;
    opening_stock?: number;
    min_stock: number;
    max_stock?: number;
    active_ingredient?: string;
    pack_size?: string;
    notes?: string;
    batch_number?: string;
    mfg_date?: string;
    expiry_date?: string;
    userId?: number;
  }): { success: boolean; product?: Product; error?: string } {
    const transaction = sqlite.transaction(() => {
      const existingSku = sqlite.prepare('SELECT id FROM products WHERE sku = ?').get(data.sku);
      if (existingSku) {
        throw new Error(`Product with SKU '${data.sku}' already exists.`);
      }

      const openingStock = Number(data.opening_stock) || 0;

      const insertProdStmt = sqlite.prepare(`
        INSERT INTO products (
          name, sku, barcode, category, subcategory, brand, manufacturer,
          unit, hsn_sac, purchase_rate, selling_rate, mrp, default_discount,
          tax_rate, current_stock, min_stock, max_stock, active_ingredient,
          pack_size, notes, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const prodRes = insertProdStmt.run(
        data.name,
        data.sku,
        data.barcode || '',
        data.category,
        data.subcategory || '',
        data.brand || '',
        data.manufacturer || '',
        data.unit || 'Bag',
        data.hsn_sac || '',
        data.purchase_rate || 0,
        data.selling_rate || 0,
        data.mrp || 0,
        data.default_discount || 0,
        data.tax_rate || 0,
        openingStock,
        data.min_stock || 10,
        data.max_stock || 1000,
        data.active_ingredient || '',
        data.pack_size || '',
        data.notes || ''
      );

      const productId = Number(prodRes.lastInsertRowid);

      // Create initial batch if opening stock or batch number provided
      if (openingStock > 0 || data.batch_number) {
        const batchNum = data.batch_number || `BATCH-${Date.now().toString().slice(-6)}`;
        const batchRes = sqlite.prepare(`
          INSERT INTO batches (
            product_id, batch_number, mfg_date, expiry_date,
            quantity, purchase_rate, mrp, selling_rate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          productId,
          batchNum,
          data.mfg_date || null,
          data.expiry_date || null,
          openingStock,
          data.purchase_rate || 0,
          data.mrp || 0,
          data.selling_rate || 0
        );

        if (openingStock > 0) {
          sqlite.prepare(`
            INSERT INTO stock_movements (
              product_id, batch_id, product_name, batch_number,
              quantity_change, movement_type, reason, previous_stock, new_stock, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            productId,
            Number(batchRes.lastInsertRowid),
            data.name,
            batchNum,
            openingStock,
            'adjustment',
            'Opening Stock on Product Creation',
            0,
            openingStock,
            data.userId || null
          );
        }
      }

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.userId || null,
        'User',
        'CREATE_PRODUCT',
        'products',
        String(productId),
        `Created product ${data.name} (SKU: ${data.sku}) with opening stock ${openingStock}`
      );

      return productId;
    });

    try {
      const prodId = transaction();
      const product = inventoryService.getProductById(prodId);
      return { success: true, product: product || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateProduct(
    id: number,
    data: Partial<Product>,
    userId?: number
  ): { success: boolean; product?: Product; error?: string } {
    try {
      const existing = sqlite.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
      if (!existing) return { success: false, error: 'Product not found' };

      sqlite.prepare(`
        UPDATE products SET
          name = COALESCE(?, name),
          barcode = COALESCE(?, barcode),
          category = COALESCE(?, category),
          subcategory = COALESCE(?, subcategory),
          brand = COALESCE(?, brand),
          manufacturer = COALESCE(?, manufacturer),
          unit = COALESCE(?, unit),
          hsn_sac = COALESCE(?, hsn_sac),
          purchase_rate = COALESCE(?, purchase_rate),
          selling_rate = COALESCE(?, selling_rate),
          mrp = COALESCE(?, mrp),
          default_discount = COALESCE(?, default_discount),
          tax_rate = COALESCE(?, tax_rate),
          min_stock = COALESCE(?, min_stock),
          max_stock = COALESCE(?, max_stock),
          active_ingredient = COALESCE(?, active_ingredient),
          pack_size = COALESCE(?, pack_size),
          notes = COALESCE(?, notes),
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        data.name ?? null,
        data.barcode ?? null,
        data.category ?? null,
        data.subcategory ?? null,
        data.brand ?? null,
        data.manufacturer ?? null,
        data.unit ?? null,
        data.hsn_sac ?? null,
        data.purchase_rate ?? null,
        data.selling_rate ?? null,
        data.mrp ?? null,
        data.default_discount ?? null,
        data.tax_rate ?? null,
        data.min_stock ?? null,
        data.max_stock ?? null,
        data.active_ingredient ?? null,
        data.pack_size ?? null,
        data.notes ?? null,
        id
      );

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId || null, 'User', 'UPDATE_PRODUCT', 'products', String(id), `Updated details for ${data.name || existing.name}`);

      const updated = inventoryService.getProductById(id);
      return { success: true, product: updated || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  adjustStock(data: {
    productId: number;
    batchId?: number;
    quantityChange: number;
    movementType: 'adjustment' | 'damage' | 'expiry' | 'return';
    reason: string;
    userId?: number;
  }): { success: boolean; error?: string } {
    const transaction = sqlite.transaction(() => {
      const prod = sqlite.prepare('SELECT name, current_stock FROM products WHERE id = ?').get(data.productId) as any;
      if (!prod) throw new Error('Product not found');

      const prevStock = prod.current_stock;
      const newStock = prevStock + data.quantityChange;
      if (newStock < 0) {
        throw new Error(`Cannot reduce stock below zero. Current: ${prevStock}, change: ${data.quantityChange}`);
      }

      // Update product current_stock
      sqlite.prepare('UPDATE products SET current_stock = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?')
        .run(newStock, data.productId);

      let batchNum: string | null = null;
      if (data.batchId) {
        const batch = sqlite.prepare('SELECT batch_number, quantity FROM batches WHERE id = ?').get(data.batchId) as any;
        if (batch) {
          batchNum = batch.batch_number;
          const newBatchQty = Math.max(0, batch.quantity + data.quantityChange);
          sqlite.prepare('UPDATE batches SET quantity = ? WHERE id = ?').run(newBatchQty, data.batchId);
        }
      }

      // Record movement
      sqlite.prepare(`
        INSERT INTO stock_movements (
          product_id, batch_id, product_name, batch_number,
          quantity_change, movement_type, reason, previous_stock, new_stock, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.productId,
        data.batchId || null,
        prod.name,
        batchNum,
        data.quantityChange,
        data.movementType,
        data.reason,
        prevStock,
        newStock,
        data.userId || null
      );

      // Audit log
      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.userId || null,
        'User',
        'STOCK_ADJUSTMENT',
        'products',
        String(data.productId),
        `Stock adjusted for ${prod.name} by ${data.quantityChange} (${data.movementType}): ${data.reason}`
      );
    });

    try {
      transaction();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getAllBatches(): (Batch & { days_left: number; expiry_status: 'expired' | 'urgent' | 'warning' | 'ok' })[] {
    const query = `
      SELECT b.*, p.name as product_name,
        CAST((julianday(b.expiry_date) - julianday('now')) AS INTEGER) as days_left
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.quantity > 0 AND b.is_active = 1
      ORDER BY date(b.expiry_date) ASC
    `;
    const rows = sqlite.prepare(query).all() as any[];

    return rows.map((r) => {
      let expiry_status: 'expired' | 'urgent' | 'warning' | 'ok' = 'ok';
      if (r.days_left <= 0) expiry_status = 'expired';
      else if (r.days_left <= 30) expiry_status = 'urgent';
      else if (r.days_left <= 90) expiry_status = 'warning';

      return {
        id: r.id,
        product_id: r.product_id,
        product_name: r.product_name,
        batch_number: r.batch_number,
        mfg_date: r.mfg_date,
        expiry_date: r.expiry_date,
        quantity: r.quantity,
        purchase_rate: r.purchase_rate,
        mrp: r.mrp,
        selling_rate: r.selling_rate,
        is_active: r.is_active,
        created_at: r.created_at,
        days_left: r.days_left ?? 999,
        expiry_status,
      };
    });
  },

  getCategories(): string[] {
    const rows = sqlite.prepare(`
      SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC
    `).all() as any[];
    return rows.map((r) => r.category);
  },

  getStockMovements(productId?: number, limit = 50): StockMovement[] {
    let query = 'SELECT * FROM stock_movements';
    const params: any[] = [];
    if (productId) {
      query += ' WHERE product_id = ?';
      params.push(productId);
    }
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);
    return sqlite.prepare(query).all(...params) as StockMovement[];
  },
};
