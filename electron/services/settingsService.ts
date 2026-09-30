import { sqlite } from '../db';
import { StoreSettings } from '../types';

export const settingsService = {
  getSettings(): StoreSettings {
    const row = sqlite.prepare('SELECT * FROM store_settings WHERE id = 1').get() as any;
    if (!row) {
      sqlite.prepare(`
        INSERT INTO store_settings (id, store_name, default_print_format, invoice_prefix)
        VALUES (1, 'Annapurna Krishi Kendra', 'thermal_80', 'INV-')
      `).run();
      return sqlite.prepare('SELECT * FROM store_settings WHERE id = 1').get() as StoreSettings;
    }
    return {
      ...row,
      auto_print_on_sale: Boolean(row.auto_print_on_sale),
    };
  },

  updateSettings(data: Partial<StoreSettings>, userId?: number): { success: boolean; settings?: StoreSettings; error?: string } {
    try {
      sqlite.prepare(`
        UPDATE store_settings SET
          store_name = COALESCE(?, store_name),
          tagline = COALESCE(?, tagline),
          proprietor_name = COALESCE(?, proprietor_name),
          address = COALESCE(?, address),
          mobile = COALESCE(?, mobile),
          email = COALESCE(?, email),
          gstin = COALESCE(?, gstin),
          dl_number_1 = COALESCE(?, dl_number_1),
          dl_number_2 = COALESCE(?, dl_number_2),
          state = COALESCE(?, state),
          state_code = COALESCE(?, state_code),
          bank_name = COALESCE(?, bank_name),
          account_number = COALESCE(?, account_number),
          ifsc_code = COALESCE(?, ifsc_code),
          upi_id = COALESCE(?, upi_id),
          invoice_prefix = COALESCE(?, invoice_prefix),
          default_printer = COALESCE(?, default_printer),
          default_print_format = COALESCE(?, default_print_format),
          auto_print_on_sale = COALESCE(?, auto_print_on_sale),
          terms_and_conditions = COALESCE(?, terms_and_conditions),
          low_stock_threshold_default = COALESCE(?, low_stock_threshold_default),
          expiry_alert_days = COALESCE(?, expiry_alert_days),
          updated_at = datetime('now', 'localtime')
        WHERE id = 1
      `).run(
        data.store_name ?? null,
        data.tagline ?? null,
        data.proprietor_name ?? null,
        data.address ?? null,
        data.mobile ?? null,
        data.email ?? null,
        data.gstin ?? null,
        data.dl_number_1 ?? null,
        data.dl_number_2 ?? null,
        data.state ?? null,
        data.state_code ?? null,
        data.bank_name ?? null,
        data.account_number ?? null,
        data.ifsc_code ?? null,
        data.upi_id ?? null,
        data.invoice_prefix ?? null,
        data.default_printer ?? null,
        data.default_print_format ?? null,
        data.auto_print_on_sale !== undefined ? (data.auto_print_on_sale ? 1 : 0) : null,
        data.terms_and_conditions ?? null,
        data.low_stock_threshold_default ?? null,
        data.expiry_alert_days ?? null
      );

      sqlite.prepare(`
        INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId || null, 'User', 'UPDATE_SETTINGS', 'store_settings', '1', 'Updated store settings');

      const updated = settingsService.getSettings();
      return { success: true, settings: updated };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
