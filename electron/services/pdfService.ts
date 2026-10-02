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
   * Generates a clean, professional, print-perfect standalone HTML document for the invoice.
   */
  public buildInvoiceHtml(sale: any, settings: any, format: string): string {
    const isA4 = format === 'a4';
    const is58 = format === 'thermal_58';

    const storeName = settings?.store_name || 'AgriDesk Agricultural Inputs';
    const tagline = settings?.tagline || 'Fertilizers, Pesticides & Hybrid Seeds';
    const address = settings?.address || 'Main Road, APMC Yard, Mandya';
    const mobile = settings?.mobile || '9876543210';
    const email = settings?.email || '';
    const gstin = settings?.gstin || '29AAAAA0000A1Z5';
    const state = settings?.state || 'Karnataka';
    const stateCode = settings?.state_code || '29';
    const dl1 = settings?.dl_number_1 || '';
    const dl2 = settings?.dl_number_2 || '';
    const bankName = settings?.bank_name || 'State Bank of India';
    const accountNo = settings?.account_number || '30123456789';
    const ifscCode = settings?.ifsc_code || 'SBIN0001234';
    const upiId = settings?.upi_id || 'annapurna@sbi';
    const terms = settings?.terms_and_conditions || 
      '1. Goods once sold will not be returned without original invoice.\n2. Store seed and chemical products in cool dry place.\n3. Subject to local jurisdiction.';

    const invNumber = sale?.invoice_number || 'INV-2026-0001';
    const invDate = sale?.sale_date ? sale.sale_date.substring(0, 10) : new Date().toISOString().substring(0, 10);
    const placeOfSupply = sale?.customer_village || state;
    const paymentMode = (sale?.payment_method || 'cash').toUpperCase();
    const customerName = sale?.customer_name || 'Walk-in Customer';
    const customerMobile = sale?.customer_mobile || '';
    const customerVillage = sale?.customer_village || '';
    const customerAddress = sale?.customer_address || '';
    const customerGstin = sale?.customer_gstin || '';
    const notes = sale?.notes || '';

    const subtotal = Number(sale?.subtotal || 0).toFixed(2);
    const discountNum = Number(sale?.total_discount || 0);
    const discount = discountNum.toFixed(2);
    const taxNum = Number(sale?.tax_amount || 0);
    const cgst = (taxNum / 2).toFixed(2);
    const sgst = (taxNum / 2).toFixed(2);
    const roundOffNum = Number(sale?.round_off || 0);
    const roundOff = roundOffNum.toFixed(2);
    const grandTotal = Number(sale?.grand_total || 0).toFixed(2);
    const paidAmount = Number(sale?.paid_amount || 0).toFixed(2);
    const balanceDueNum = Number(sale?.balance_due || 0);
    const balanceDue = balanceDueNum.toFixed(2);
    const items = sale?.items || [];

    if (isA4) {
      const itemRows = items.map((it: any, idx: number) => {
        // Resolve HSN code: use item.hsn_sac if available, otherwise categorize based on unit or product nature
        let hsn = it.hsn_sac;
        if (!hsn) {
          if (it.product_name?.toLowerCase().includes('urea') || it.product_name?.toLowerCase().includes('dap') || it.product_name?.toLowerCase().includes('potash') || it.product_name?.toLowerCase().includes('fertilizer') || it.unit === 'Bag') {
            hsn = '3102';
          } else if (it.tax_rate === 18 || it.unit === 'Bottle' || it.product_name?.toLowerCase().includes('chlorpyrifos') || it.product_name?.toLowerCase().includes('cypermethrin') || it.product_name?.toLowerCase().includes('mancozeb')) {
            hsn = '3808';
          } else if (it.product_name?.toLowerCase().includes('seed') || it.tax_rate === 0) {
            hsn = '1209';
          } else {
            hsn = '3102';
          }
        }

        const discAmount = Number(it.discount_amount || 0);
        const taxable = Number(it.taxable_amount || (Number(it.rate || 0) * Number(it.quantity || 1) - discAmount)).toFixed(2);
        const total = Number(it.total_amount || 0).toFixed(2);
        const rate = Number(it.rate || 0).toFixed(2);

        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: 600; color: #0F172A;">${it.product_name}</td>
            <td style="text-align: center;">${hsn}</td>
            <td style="text-align: center;">
              <div class="batch-exp">
                <span class="batch-badge">${it.batch_number || '-'}</span>
                ${it.expiry_date ? `<br><span class="exp-text">Exp: ${it.expiry_date.substring(0, 7)}</span>` : ''}
              </div>
            </td>
            <td style="text-align: center; font-weight: 600;">${it.quantity} ${it.unit || ''}</td>
            <td style="text-align: right;">₹${rate}</td>
            <td style="text-align: right;">${discAmount > 0 ? '₹' + discAmount.toFixed(2) : '-'}</td>
            <td style="text-align: right;">₹${taxable}</td>
            <td style="text-align: center;">${it.tax_rate}%</td>
            <td style="text-align: right; font-weight: 700; color: #0F172A;">₹${total}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="a4-page">
          <!-- Store Header & Document Meta -->
          <div class="header-strip">
            <div class="header-left">
              <div class="store-name">${storeName}</div>
              ${tagline ? `<div class="store-tagline">${tagline}</div>` : ''}
              <div class="store-address">${address}</div>
              <div class="store-contact">Phone: <strong>${mobile}</strong>${email ? ` | Email: <strong>${email}</strong>` : ''}</div>
              <div class="store-tax">
                GSTIN: <strong>${gstin}</strong> | State: <strong>${state} (${stateCode})</strong>
              </div>
              <div class="store-licenses">
                ${dl1 ? `Pesticide Lic No: <strong>${dl1}</strong>` : ''}
                ${dl1 && dl2 ? ' | ' : ''}
                ${dl2 ? `Fertilizer Lic No: <strong>${dl2}</strong>` : ''}
              </div>
            </div>
            <div class="header-right">
              <div class="doc-title-badge">TAX INVOICE / CASH MEMO</div>
              <div class="meta-card">
                <div class="meta-row">
                  <span class="meta-label">Invoice Number:</span>
                  <span class="meta-value inv-num">${invNumber}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Invoice Date:</span>
                  <span class="meta-value">${invDate}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Place of Supply:</span>
                  <span class="meta-value">${placeOfSupply}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Payment Mode:</span>
                  <span class="meta-value">${paymentMode}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Reverse Charge:</span>
                  <span class="meta-value">No</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Customer / Billed To Section -->
          <div class="customer-section">
            <div class="section-title">Billed To (Details of Receiver / Farmer)</div>
            <div class="customer-details">
              <div class="customer-col">
                <div class="cust-row"><span class="cust-label">Name:</span> <span class="cust-val">${customerName}</span></div>
                <div class="cust-row"><span class="cust-label">Mobile:</span> <span class="cust-val">${customerMobile || 'N/A'}</span></div>
                <div class="cust-row"><span class="cust-label">Village / Town:</span> <span class="cust-val">${customerVillage || 'Local'}</span></div>
              </div>
              <div class="customer-col">
                <div class="cust-row"><span class="cust-label">Address:</span> <span class="cust-val">${customerAddress || 'Local Counter'}</span></div>
                <div class="cust-row"><span class="cust-label">GSTIN / UID:</span> <span class="cust-val">${customerGstin || 'Unregistered'}</span></div>
                <div class="cust-row"><span class="cust-label">State:</span> <span class="cust-val">${state} (${stateCode})</span></div>
              </div>
            </div>
          </div>

          <!-- Product Table -->
          <table class="product-table">
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">#</th>
                <th style="text-align: left;">Description of Goods</th>
                <th style="width: 58px; text-align: center;">HSN/SAC</th>
                <th style="width: 90px; text-align: center;">Batch & Exp</th>
                <th style="width: 55px; text-align: center;">Qty</th>
                <th style="width: 65px; text-align: right;">Rate</th>
                <th style="width: 50px; text-align: right;">Disc</th>
                <th style="width: 70px; text-align: right;">Taxable</th>
                <th style="width: 45px; text-align: center;">GST %</th>
                <th style="width: 80px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Bank Details & Totals Block -->
          <div class="bottom-grid keep-together">
            <div class="bank-card">
              <div class="section-title">Bank Details for Direct RTGS/NEFT</div>
              <div class="bank-row"><span class="bank-label">Bank Name:</span> <strong>${bankName}</strong></div>
              <div class="bank-row"><span class="bank-label">Account No:</span> <strong>${accountNo}</strong></div>
              <div class="bank-row"><span class="bank-label">IFSC Code:</span> <strong>${ifscCode}</strong></div>
              <div class="bank-row"><span class="bank-label">UPI ID:</span> <strong>${upiId}</strong></div>
              ${notes ? `<div class="invoice-notes"><strong>Notes:</strong> ${notes}</div>` : ''}
            </div>

            <div class="totals-card">
              <div class="totals-row">
                <span>Total Item Subtotal:</span>
                <span>₹${subtotal}</span>
              </div>
              ${discountNum > 0 ? `
              <div class="totals-row discount-row">
                <span>Total Discount:</span>
                <span>-₹${discount}</span>
              </div>` : ''}
              <div class="totals-row">
                <span>CGST (Central Tax):</span>
                <span>₹${cgst}</span>
              </div>
              <div class="totals-row">
                <span>SGST (State Tax):</span>
                <span>₹${sgst}</span>
              </div>
              ${roundOffNum !== 0 ? `
              <div class="totals-row">
                <span>Round Off:</span>
                <span>${roundOffNum < 0 ? '-' : '+'}₹${Math.abs(roundOffNum).toFixed(2)}</span>
              </div>` : ''}
              <div class="totals-row grand-total-row">
                <span>GRAND TOTAL:</span>
                <span>₹${grandTotal}</span>
              </div>
              <div class="totals-row paid-row">
                <span>Amount Paid:</span>
                <span>₹${paidAmount}</span>
              </div>
              ${balanceDueNum > 0 ? `
              <div class="totals-row due-row">
                <span>Balance Due:</span>
                <span>₹${balanceDue}</span>
              </div>` : ''}
            </div>
          </div>

          <!-- Terms & Signatures -->
          <div class="footer-grid keep-together">
            <div class="terms-card">
              <div class="terms-title">Terms & Conditions</div>
              <div class="terms-text">${terms.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="sign-card">
              <div class="sign-for">For <strong>${storeName}</strong></div>
              <div class="sign-space"></div>
              <div class="sign-line">Authorized Signatory</div>
            </div>
          </div>
        </div>
      `;
    }

    // Thermal Format (80mm or 58mm)
    const is58mm = is58;
    const thermalRows = items.map((it: any) => {
      const bText = it.batch_number ? `B:${it.batch_number}` : '';
      const expText = it.expiry_date ? `Exp:${it.expiry_date.substring(0, 7)}` : '';
      const bExp = [bText, expText].filter(Boolean).join(' ');

      if (is58mm) {
        return `
          <tr>
            <td colspan="3" style="padding-top: 3px; font-weight: bold; font-size: 8.5px;">${it.product_name}</td>
          </tr>
          <tr style="border-bottom: 1px dotted #CBD5E1;">
            <td style="font-size: 7.5px; color: #475569;">${bExp ? bExp + ' ' : ''}@${Number(it.rate || 0).toFixed(0)}</td>
            <td style="text-align: center; font-size: 8px;">${it.quantity} ${it.unit || ''}</td>
            <td style="text-align: right; font-weight: bold; font-size: 8.5px;">₹${Number(it.total_amount || 0).toFixed(1)}</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td colspan="4" style="padding-top: 3px; font-weight: bold; font-size: 10px;">${it.product_name}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #CBD5E1;">
          <td style="font-size: 8.5px; color: #475569;">${bExp}</td>
          <td style="text-align: center; font-size: 9.5px;">${it.quantity} ${it.unit || ''}</td>
          <td style="text-align: right; font-size: 9.5px;">₹${Number(it.rate || 0).toFixed(1)}</td>
          <td style="text-align: right; font-weight: bold; font-size: 10px;">₹${Number(it.total_amount || 0).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const widthClass = is58mm ? 'thermal-58' : 'thermal-80';

    return `
      <div class="thermal-page ${widthClass}">
        <div class="thermal-header">
          <div class="thermal-store-name">${storeName}</div>
          ${tagline ? `<div class="thermal-tagline">${tagline}</div>` : ''}
          <div class="thermal-address">${address}</div>
          <div>Ph: ${mobile}</div>
          <div>GSTIN: ${gstin}</div>
          ${dl1 ? `<div>Lic: ${dl1}</div>` : ''}
        </div>

        <div class="thermal-meta">
          <div style="display: flex; justify-content: space-between;">
            <span>Bill: <strong>${invNumber}</strong></span>
            <span>Date: ${invDate}</span>
          </div>
          <div>Cust: <strong>${customerName}</strong> ${customerMobile ? `(${customerMobile})` : ''}</div>
          ${customerVillage ? `<div>Place: ${customerVillage}</div>` : ''}
          <div>Payment: ${paymentMode}</div>
        </div>

        <table class="thermal-table">
          <thead>
            <tr>
              <th style="text-align: left;">Item</th>
              ${!is58mm ? `<th style="text-align: center;">Qty</th><th style="text-align: right;">Rate</th>` : `<th style="text-align: center;">Qty</th>`}
              <th style="text-align: right;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${thermalRows}
          </tbody>
        </table>

        <div class="thermal-totals">
          <div class="th-row"><span>Subtotal:</span><span>₹${subtotal}</span></div>
          ${discountNum > 0 ? `<div class="th-row"><span>Discount:</span><span>-₹${discount}</span></div>` : ''}
          <div class="th-row"><span>CGST:</span><span>₹${cgst}</span></div>
          <div class="th-row"><span>SGST:</span><span>₹${sgst}</span></div>
          ${roundOffNum !== 0 ? `<div class="th-row"><span>Round Off:</span><span>${roundOffNum < 0 ? '-' : '+'}₹${Math.abs(roundOffNum).toFixed(2)}</span></div>` : ''}
          <div class="th-row th-grand"><span>GRAND TOTAL:</span><span>₹${grandTotal}</span></div>
          <div class="th-row th-paid"><span>Paid Amount:</span><span>₹${paidAmount}</span></div>
          ${balanceDueNum > 0 ? `<div class="th-row th-due"><span>Balance Due:</span><span>₹${balanceDue}</span></div>` : ''}
        </div>

        <div class="thermal-footer">
          <div>Thank You • Visit Again!</div>
          <div style="font-size: 8px; color: #64748B; margin-top: 2px;">Subject to Local Jurisdiction</div>
        </div>
      </div>
    `;
  }

  /**
   * Generates a genuine, valid Adobe PDF document containing ONLY the invoice.
   */
  async generateInvoicePdf(options: GeneratePdfOptions): Promise<{ filePath: string; fileSize: number }> {
    const { targetPath, format = 'a4', invoiceHtml, sale, settings } = options;

    // Use our robust self-contained invoice generator when sale is provided
    const bodyContent = (sale && settings) 
      ? this.buildInvoiceHtml(sale, settings, format)
      : (invoiceHtml || this.buildInvoiceHtml(sale, settings, format));

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
  <title>Invoice ${sale?.invoice_number || 'AgriDesk'}</title>
  <style>
    @page {
      size: ${pageSizeRule};
      margin: ${format === 'a4' ? '8mm 10mm 8mm 10mm' : '3mm'};
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
      color: #111827 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      line-height: 1.35;
    }

    /* A4 Specific Professional Layout Styles */
    .a4-page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .header-strip {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #123F7A;
      padding-bottom: 6px;
      margin-bottom: 8px;
      gap: 16px;
    }
    .header-left {
      flex: 1;
    }
    .header-right {
      width: 250px;
      text-align: right;
    }
    .store-name {
      font-size: 20px;
      font-weight: 800;
      color: #123F7A;
      letter-spacing: -0.3px;
      line-height: 1.1;
    }
    .store-tagline {
      font-size: 10.5px;
      font-weight: 600;
      color: #4B5563;
      margin-top: 2px;
    }
    .store-address {
      font-size: 10px;
      color: #1F2937;
      margin-top: 3px;
    }
    .store-contact, .store-tax, .store-licenses {
      font-size: 9.5px;
      color: #374151;
      margin-top: 1.5px;
    }
    .doc-title-badge {
      display: inline-block;
      background: #123F7A;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .meta-card {
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 5px 8px;
      background: #F8FAFC;
      font-size: 9.5px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 1.5px 0;
    }
    .meta-label {
      color: #4B5563;
      font-weight: 600;
    }
    .meta-value {
      color: #111827;
      font-weight: 700;
    }
    .meta-value.inv-num {
      color: #123F7A;
      font-size: 11px;
    }
    .customer-section {
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 8px;
      background: #F8FAFC;
    }
    .section-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #123F7A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 2px;
      margin-bottom: 4px;
    }
    .customer-details {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .customer-col {
      flex: 1;
      font-size: 9.5px;
    }
    .cust-row {
      padding: 1px 0;
    }
    .cust-label {
      color: #4B5563;
      font-weight: 600;
      display: inline-block;
      width: 80px;
    }
    .cust-val {
      color: #111827;
      font-weight: 600;
    }
    .product-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 9.5px;
    }
    .product-table th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
      padding: 5px 4px;
      border: 1px solid #CBD5E1;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .product-table td {
      padding: 5px 4px;
      border: 1px solid #CBD5E1;
      color: #1F2937;
      vertical-align: middle;
    }
    .product-table tbody tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    .batch-exp {
      font-size: 8.5px;
      line-height: 1.25;
    }
    .batch-badge {
      font-weight: 700;
      color: #0F172A;
    }
    .exp-text {
      color: #64748B;
    }
    .bottom-grid {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .bank-card {
      flex: 1.1;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 6px 10px;
      background: #F8FAFC;
      font-size: 9.5px;
    }
    .bank-row {
      padding: 1.5px 0;
    }
    .bank-label {
      color: #4B5563;
      display: inline-block;
      width: 80px;
    }
    .invoice-notes {
      margin-top: 5px;
      padding: 4px 6px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 3px;
      color: #374151;
      font-size: 9px;
    }
    .totals-card {
      flex: 0.9;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 6px 10px;
      background: #FFFFFF;
      font-size: 9.5px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      color: #374151;
    }
    .discount-row {
      color: #166534;
      font-weight: 600;
    }
    .grand-total-row {
      border-top: 2px solid #123F7A;
      padding-top: 4px;
      margin-top: 4px;
      font-size: 13px;
      font-weight: 800;
      color: #123F7A;
    }
    .paid-row {
      border-top: 1px dashed #CBD5E1;
      padding-top: 3px;
      margin-top: 3px;
      font-weight: 700;
      color: #166534;
    }
    .due-row {
      font-weight: 700;
      color: #DC2626;
    }
    .footer-grid {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 6px 10px;
      background: #F8FAFC;
    }
    .terms-card {
      flex: 1.3;
      font-size: 8.5px;
      color: #4B5563;
      line-height: 1.35;
    }
    .terms-title {
      font-weight: 700;
      color: #111827;
      margin-bottom: 2px;
      font-size: 9px;
    }
    .sign-card {
      flex: 0.7;
      text-align: right;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 55px;
    }
    .sign-for {
      font-size: 9.5px;
      color: #111827;
    }
    .sign-space {
      flex: 1;
    }
    .sign-line {
      border-top: 1px solid #374151;
      padding-top: 2px;
      font-size: 9px;
      font-weight: 700;
      color: #111827;
      width: 140px;
      margin-left: auto;
      text-align: center;
    }
    .keep-together {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table {
      page-break-inside: auto;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Thermal Specific Layout Styles */
    .thermal-page {
      margin: 0 auto;
      font-family: 'Courier New', Courier, monospace;
      color: #000000;
    }
    .thermal-80 {
      width: 72mm;
      padding: 2mm;
      font-size: 9.5px;
    }
    .thermal-58 {
      width: 48mm;
      padding: 1mm;
      font-size: 8.5px;
    }
    .thermal-header {
      text-align: center;
      border-bottom: 1px dashed #000000;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .thermal-store-name {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .thermal-tagline {
      font-size: 8.5px;
    }
    .thermal-address {
      font-size: 8.5px;
    }
    .thermal-meta {
      border-bottom: 1px dashed #000000;
      padding-bottom: 4px;
      margin-bottom: 4px;
      font-size: 9px;
      line-height: 1.35;
    }
    .thermal-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .thermal-table th {
      border-bottom: 1px dashed #000000;
      font-size: 9px;
      padding-bottom: 2px;
    }
    .thermal-totals {
      border-bottom: 1px dashed #000000;
      padding-bottom: 4px;
      margin-bottom: 4px;
      font-size: 9px;
      line-height: 1.35;
    }
    .th-row {
      display: flex;
      justify-content: space-between;
    }
    .th-grand {
      font-weight: bold;
      font-size: 11px;
      border-top: 1px dashed #000000;
      padding-top: 2px;
      margin-top: 2px;
    }
    .th-paid {
      font-weight: bold;
    }
    .th-due {
      font-weight: bold;
    }
    .thermal-footer {
      text-align: center;
      font-size: 9px;
      margin-top: 4px;
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

      // Verify authentic PDF signature before writing
      if (pdfBuffer.length < 100 || pdfBuffer.subarray(0, 4).toString('ascii') !== '%PDF') {
        throw new Error('Generated PDF buffer does not contain valid %PDF signature');
      }

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
