import { sqlite } from '../db';
import { PrintJob, PrintFormat, PrintStatus } from '../types';

export const printingService = {
  createPrintJob(saleId: number, invoiceNumber: string, printType: PrintFormat = 'thermal_80', printerName?: string): PrintJob {
    const res = sqlite.prepare(`
      INSERT INTO print_jobs (sale_id, invoice_number, printer_name, print_type, status, attempts)
      VALUES (?, ?, ?, ?, 'pending', 0)
    `).run(saleId, invoiceNumber, printerName || 'Default Printer', printType);

    const job = sqlite.prepare('SELECT * FROM print_jobs WHERE id = ?').get(res.lastInsertRowid) as PrintJob;
    return job;
  },

  updatePrintStatus(saleId: number, status: PrintStatus, errorMessage?: string, printType: PrintFormat = 'thermal_80'): { success: boolean } {
    try {
      // Update sales table print_status and increment print_count if printed
      if (status === 'printed') {
        sqlite.prepare(`
          UPDATE sales
          SET print_status = 'printed', print_count = print_count + 1, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(saleId);
      } else {
        sqlite.prepare(`
          UPDATE sales
          SET print_status = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(status, saleId);
      }

      // Update or create print job record
      const existingJob = sqlite.prepare(`
        SELECT id, attempts FROM print_jobs WHERE sale_id = ? ORDER BY id DESC LIMIT 1
      `).get(saleId) as any;

      const completedAt = status === 'printed' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : null;
      const jobStatus = status === 'printed' ? 'success' : status === 'failed' ? 'failed' : 'pending';

      if (existingJob) {
        sqlite.prepare(`
          UPDATE print_jobs
          SET status = ?, attempts = attempts + 1, error_message = ?, completed_at = COALESCE(?, completed_at)
          WHERE id = ?
        `).run(jobStatus, errorMessage || null, completedAt, existingJob.id);
      } else {
        const sale = sqlite.prepare('SELECT invoice_number FROM sales WHERE id = ?').get(saleId) as any;
        sqlite.prepare(`
          INSERT INTO print_jobs (sale_id, invoice_number, print_type, status, attempts, error_message, completed_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `).run(saleId, sale?.invoice_number || `INV-${saleId}`, printType, jobStatus, errorMessage || null, completedAt);
      }

      // Audit log
      sqlite.prepare(`
        INSERT INTO audit_logs (username, action, entity_type, entity_id, details)
        VALUES ('System', 'PRINT_INVOICE', 'sales', ?, ?)
      `).run(String(saleId), `Invoice print status updated to ${status}${errorMessage ? ': ' + errorMessage : ''}`);

      return { success: true };
    } catch (err: any) {
      console.error('Error updating print status:', err);
      return { success: false };
    }
  },

  getPrintJobs(limit = 50): PrintJob[] {
    return sqlite.prepare(`
      SELECT * FROM print_jobs ORDER BY id DESC LIMIT ?
    `).all(limit) as PrintJob[];
  },

  reprintSale(saleId: number, printType?: PrintFormat): { success: boolean; job?: PrintJob; error?: string } {
    try {
      const sale = sqlite.prepare('SELECT id, invoice_number FROM sales WHERE id = ?').get(saleId) as any;
      if (!sale) return { success: false, error: 'Sale not found' };

      const format = printType || 'thermal_80';
      const job = printingService.createPrintJob(sale.id, sale.invoice_number, format);
      return { success: true, job };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
