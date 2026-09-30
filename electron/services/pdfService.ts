import { BrowserWindow } from 'electron';
import fs from 'fs';

export interface GeneratePdfOptions {
  targetPath: string;
  format?: 'thermal_80' | 'thermal_58' | 'a4' | string;
  invoiceHtml?: string;
  sale?: any;
  settings?: any;
}

export class PdfService {
  /**
   * Generates a clean standalone HTML string for the invoice if raw innerHTML is not supplied.
   */
  private buildInvoiceHtml(sale: any, settings: any, format: string): string {
    const isA4 = format === 'a4';
    const is58 = format === 'thermal_58';
    const storeName = settings?.store_name || 'AgriStore Agricultural Inputs';
    const address = settings?.address || 'Main Road, Agricultural Market Yard';
    const mobile = settings?.mobile || '9876543210';
    const gstin = settings?.gstin || '29AAAAA0000A1Z5';
    const invNumber = sale?.invoice_number || 'INV-2026-0001';
    const date = sale?.sale_date ? sale.sale_date.substring(0, 10) : new Date().toISOString().substring(0, 10);
    const customerName = sale?.customer_name || 'Walk-in Customer';
    const customerMobile = sale?.customer_mobile || '';
    const paymentMethod = (sale?.payment_method || 'CASH').toUpperCase();
    const subtotal = Number(sale?.subtotal || 0).toFixed(2);
    const taxAmount = Number(sale?.tax_amount || 0).toFixed(2);
    const discount = Number(sale?.total_discount || 0).toFixed(2);
    const grandTotal = Number(sale?.grand_total || 0).toFixed(2);
    const paidAmount = Number(sale?.paid_amount || 0).toFixed(2);
    const balanceDue = Number(sale?.balance_due || 0).toFixed(2);
    const items = sale?.items || [];

    if (isA4) {
      const itemRows = items.map((it: any, idx: number) => `
        <tr>
          <td style="text-align: center; border: 1px solid #111; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #111; padding: 5px; font-weight: 600;">${it.product_name}</td>
          <td style="text-align: center; border: 1px solid #111; padding: 5px;">${it.unit === 'Bag' ? '3102' : '3808'}</td>
          <td style="text-align: center; border: 1px solid #111; padding: 5px;">${it.batch_number || '-'}${it.expiry_date ? '<br><small>Exp: ' + it.expiry_date.substring(0, 7) + '</small>' : ''}</td>
          <td style="text-align: center; border: 1px solid #111; padding: 5px;">${it.quantity} ${it.unit || ''}</td>
          <td style="text-align: right; border: 1px solid #111; padding: 5px;">₹${Number(it.rate || 0).toFixed(2)}</td>
          <td style="text-align: right; border: 1px solid #111; padding: 5px;">${Number(it.discount_amount || 0) > 0 ? '₹' + Number(it.discount_amount).toFixed(2) : '-'}</td>
          <td style="text-align: right; border: 1px solid #111; padding: 5px;">₹${Number(it.taxable_amount || 0).toFixed(2)}</td>
          <td style="text-align: center; border: 1px solid #111; padding: 5px;">${it.tax_rate}%</td>
          <td style="text-align: right; border: 1px solid #111; padding: 5px; font-weight: bold;">₹${Number(it.total_amount || 0).toFixed(2)}</td>
        </tr>
      `).join('');

      return `
        <div style="max-width: 794px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111;">
          <div style="text-align: center; font-size: 14px; font-weight: bold; border-bottom: 2px solid #123F7A; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase;">
            Tax Invoice / Cash Memo (Agricultural Inputs)
          </div>
          <div style="display: flex; justify-content: space-between; border: 1px solid #111; padding: 10px; margin-bottom: 10px;">
            <div>
              <div style="font-size: 16px; font-weight: bold; color: #123F7A;">${storeName}</div>
              <div>${address}</div>
              <div>Phone: ${mobile} | GSTIN: ${gstin}</div>
              ${settings?.dl_number_1 ? `<div>Pesticide Lic: ${settings.dl_number_1} | Fert Lic: ${settings.dl_number_2 || '-'}</div>` : ''}
            </div>
            <div style="text-align: right;">
              <div style="background: #f0f4f8; border: 1px solid #ccc; padding: 4px 8px; font-weight: bold; color: #123F7A; margin-bottom: 4px;">
                Invoice: ${invNumber}
              </div>
              <div>Date: ${date}</div>
              <div>Payment: <strong>${paymentMethod}</strong></div>
              <div>State: ${settings?.state || 'Karnataka'} (29)</div>
            </div>
          </div>
          <div style="border: 1px solid #111; padding: 8px; margin-bottom: 10px; background: #fafafa;">
            <strong>Billed to (Farmer / Customer):</strong> ${customerName} | Phone: ${customerMobile || 'N/A'} | Village: ${sale?.customer_village || 'Local'}
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px;">
            <thead>
              <tr style="background: #f0f4f8;">
                <th style="border: 1px solid #111; padding: 5px; width: 30px;">#</th>
                <th style="border: 1px solid #111; padding: 5px; text-align: left;">Description of Goods</th>
                <th style="border: 1px solid #111; padding: 5px; width: 60px;">HSN</th>
                <th style="border: 1px solid #111; padding: 5px; width: 80px;">Batch & Exp</th>
                <th style="border: 1px solid #111; padding: 5px; width: 50px;">Qty</th>
                <th style="border: 1px solid #111; padding: 5px; width: 60px; text-align: right;">Rate</th>
                <th style="border: 1px solid #111; padding: 5px; width: 50px; text-align: right;">Disc</th>
                <th style="border: 1px solid #111; padding: 5px; width: 65px; text-align: right;">Taxable</th>
                <th style="border: 1px solid #111; padding: 5px; width: 45px;">GST%</th>
                <th style="border: 1px solid #111; padding: 5px; width: 75px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          <div style="display: flex; justify-content: space-between; border: 1px solid #111; padding: 10px; margin-bottom: 10px;">
            <div style="font-size: 10px; width: 50%;">
              <strong>Bank Details:</strong><br>
              Bank: ${settings?.bank_name || 'State Bank of India'}<br>
              A/C No: ${settings?.account_number || '30123456789'}<br>
              IFSC: ${settings?.ifsc_code || 'SBIN0001234'}<br>
              UPI ID: ${settings?.upi_id || 'annapurna@sbi'}
            </div>
            <div style="width: 45%; text-align: right; line-height: 1.6;">
              <div>Subtotal: ₹${subtotal}</div>
              ${Number(discount) > 0 ? `<div style="color: #166534;">Discount: -₹${discount}</div>` : ''}
              <div>Tax (CGST + SGST): ₹${taxAmount}</div>
              <div style="font-size: 14px; font-weight: bold; color: #123F7A; border-top: 1px solid #111; padding-top: 4px; margin-top: 4px;">
                GRAND TOTAL: ₹${grandTotal}
              </div>
              <div>Amount Paid: ₹${paidAmount}</div>
              ${Number(balanceDue) > 0 ? `<div style="font-weight: bold; color: #dc2626;">Balance Due: ₹${balanceDue}</div>` : ''}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; border: 1px solid #111; padding: 8px; font-size: 9.5px;">
            <div style="width: 60%;">
              <strong>Terms & Conditions:</strong><br>
              1. Goods once sold will not be returned without original invoice.<br>
              2. Store seed and chemical products in cool dry place.
            </div>
            <div style="text-align: right; width: 35%; display: flex; flex-direction: column; justify-content: space-between; height: 60px;">
              <div>For <strong>${storeName}</strong></div>
              <div style="border-top: 1px solid #111; padding-top: 2px;">Authorized Signatory</div>
            </div>
          </div>
        </div>
      `;
    }

    // Thermal (80mm / 58mm)
    const thermalWidth = is58 ? '210px' : '285px';
    const thermalRows = items.map((it: any) => `
      <tr>
        <td colspan="4" style="padding-top: 3px; font-weight: bold;">${it.product_name}</td>
      </tr>
      <tr style="border-bottom: 1px dashed #ccc;">
        <td style="font-size: 9px; color: #555;">${it.batch_number ? 'B:' + it.batch_number : ''}</td>
        <td style="text-align: center;">${it.quantity} ${it.unit || ''}</td>
        <td style="text-align: right;">₹${Number(it.rate || 0).toFixed(1)}</td>
        <td style="text-align: right; font-weight: bold;">₹${Number(it.total_amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <div style="width: ${thermalWidth}; margin: 0 auto; padding: 6px; font-family: monospace; font-size: 10px; color: #111;">
        <div style="text-align: center; border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 4px;">
          <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${storeName}</div>
          <div>${address}</div>
          <div>Ph: ${mobile} | GSTIN: ${gstin}</div>
        </div>
        <div style="border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 4px; font-size: 9.5px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Bill: <strong>${invNumber}</strong></span>
            <span>Date: ${date}</span>
          </div>
          <div>Cust: ${customerName} ${customerMobile ? '(' + customerMobile + ')' : ''}</div>
          <div>Payment: ${paymentMethod}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 9.5px;">
          <thead>
            <tr style="border-bottom: 1px dashed #111;">
              <th style="text-align: left;">Item</th>
              <th>Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${thermalRows}
          </tbody>
        </table>
        <div style="border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 4px; font-size: 9.5px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${subtotal}</span></div>
          ${Number(discount) > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount:</span><span>-₹${discount}</span></div>` : ''}
          <div style="display: flex; justify-content: space-between;"><span>GST Included:</span><span>₹${taxAmount}</span></div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; border-top: 1px dashed #111; padding-top: 2px;">
            <span>GRAND TOTAL:</span><span>₹${grandTotal}</span>
          </div>
          <div style="display: flex; justify-content: space-between;"><span>Paid Amount:</span><span>₹${paidAmount}</span></div>
          ${Number(balanceDue) > 0 ? `<div style="display: flex; justify-content: space-between; font-weight: bold;"><span>Balance Due:</span><span>₹${balanceDue}</span></div>` : ''}
        </div>
        <div style="text-align: center; font-size: 9px; margin-top: 6px;">
          Thank You! Visit Again<br>Subject to Local Jurisdiction
        </div>
      </div>
    `;
  }

  /**
   * Generates a genuine, valid Adobe PDF document containing ONLY the invoice.
   */
  async generateInvoicePdf(options: GeneratePdfOptions): Promise<{ filePath: string; fileSize: number }> {
    const { targetPath, format = 'a4', invoiceHtml, sale, settings } = options;
    const bodyContent = invoiceHtml || this.buildInvoiceHtml(sale, settings, format);

    let pageSizeRule = 'A4 portrait';
    let pdfPageSize: any = 'A4';

    if (format === 'thermal_80') {
      pageSizeRule = '80mm 297mm';
      pdfPageSize = { width: 3.15, height: 11.69 };
    } else if (format === 'thermal_58') {
      pageSizeRule = '58mm 297mm';
      pdfPageSize = { width: 2.28, height: 11.69 };
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${sale?.invoice_number || 'AgriStore'}</title>
  <style>
    @page {
      size: ${pageSizeRule};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #FFFFFF !important;
      color: #000000 !important;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

    const printWin = new BrowserWindow({
      show: false,
      width: format === 'a4' ? 820 : 350,
      height: 1100,
      webPreferences: {
        sandbox: false,
        javascript: false,
      },
    });

    try {
      await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

      const pdfBuffer = await printWin.webContents.printToPDF({
        pageSize: pdfPageSize,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true,
      });

      await fs.promises.writeFile(targetPath, pdfBuffer);

      return {
        filePath: targetPath,
        fileSize: pdfBuffer.length,
      };
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.destroy();
      }
    }
  }
}

export const pdfService = new PdfService();
