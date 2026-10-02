import React from 'react';
import { Sale, StoreSettings } from '../../types';

interface Props {
  sale: Sale;
  settings: StoreSettings;
}

export const InvoiceA4: React.FC<Props> = ({ sale, settings }) => {
  const storeName = settings.store_name || 'AgriDesk Agricultural Inputs';
  const tagline = settings.tagline || 'Fertilizers, Pesticides & Hybrid Seeds';
  const address = settings.address || 'Main Road, APMC Yard, Mandya';
  const mobile = settings.mobile || '9876543210';
  const email = settings.email || '';
  const gstin = settings.gstin || '29AAAAA0000A1Z5';
  const state = settings.state || 'Karnataka';
  const stateCode = settings.state_code || '29';
  const dl1 = settings.dl_number_1 || '';
  const dl2 = settings.dl_number_2 || '';
  const bankName = settings.bank_name || 'State Bank of India';
  const accountNo = settings.account_number || '30123456789';
  const ifscCode = settings.ifsc_code || 'SBIN0001234';
  const upiId = settings.upi_id || 'annapurna@sbi';
  const terms = settings.terms_and_conditions || 
    '1. Goods once sold will not be returned without original invoice.\n2. Store seed and chemical products in cool dry place.\n3. Subject to local jurisdiction.';

  const invNumber = sale.invoice_number || 'INV-2026-0001';
  const invDate = sale.sale_date ? sale.sale_date.substring(0, 10) : new Date().toISOString().substring(0, 10);
  const placeOfSupply = sale.customer_village || state;
  const paymentMode = (sale.payment_method || 'cash').toUpperCase();
  const customerName = sale.customer_name || 'Walk-in Customer';
  const customerMobile = sale.customer_mobile || '';
  const customerVillage = sale.customer_village || '';
  const customerAddress = sale.customer_address || '';
  const customerGstin = sale.customer_gstin || '';

  const subtotal = Number(sale.subtotal || 0).toFixed(2);
  const discountNum = Number(sale.total_discount || 0);
  const discount = discountNum.toFixed(2);
  const taxNum = Number(sale.tax_amount || 0);
  const cgst = (taxNum / 2).toFixed(2);
  const sgst = (taxNum / 2).toFixed(2);
  const roundOffNum = Number(sale.round_off || 0);
  const roundOff = roundOffNum.toFixed(2);
  const grandTotal = Number(sale.grand_total || 0).toFixed(2);
  const paidAmount = Number(sale.paid_amount || 0).toFixed(2);
  const balanceDueNum = Number(sale.balance_due || 0);
  const balanceDue = balanceDueNum.toFixed(2);
  const items = sale.items || [];

  return (
    <div className="w-[794px] p-6 bg-white text-black font-sans text-xs select-text mx-auto border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-2">
      {/* Header Strip */}
      <div className="flex justify-between border-b-2 border-[#123F7A] pb-2 mb-3 gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-[#123F7A] tracking-tight">{storeName}</h1>
          {tagline && <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{tagline}</p>}
          <p className="text-[10px] text-gray-800 mt-1">{address}</p>
          <p className="text-[9.5px] text-gray-700 mt-0.5">Phone: <strong>{mobile}</strong>{email ? ` | Email: <strong>{email}</strong>` : ''}</p>
          <div className="mt-1 text-[9.5px] text-gray-800 space-y-0.5">
            <p>GSTIN: <strong>{gstin}</strong> | State: <strong>{state} ({stateCode})</strong></p>
            {(dl1 || dl2) && (
              <p>
                {dl1 ? <>Pesticide Lic No: <strong>{dl1}</strong></> : null}
                {dl1 && dl2 ? ' | ' : null}
                {dl2 ? <>Fertilizer Lic No: <strong>{dl2}</strong></> : null}
              </p>
            )}
          </div>
        </div>

        <div className="w-64 text-right">
          <div className="inline-block bg-[#123F7A] text-white text-[10px] font-bold px-2.5 py-1 rounded-xs uppercase tracking-wider mb-2">
            Tax Invoice / Cash Memo
          </div>
          <div className="border border-slate-300 rounded-sm p-1.5 bg-slate-50 text-[9.5px] space-y-1 text-left">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Invoice Number:</span>
              <span className="font-bold text-[#123F7A]">{invNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Invoice Date:</span>
              <span className="font-bold text-gray-900">{invDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Place of Supply:</span>
              <span className="font-bold text-gray-900">{placeOfSupply}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Payment Mode:</span>
              <span className="font-bold text-gray-900">{paymentMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Reverse Charge:</span>
              <span className="font-bold text-gray-900">No</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer / Customer Info */}
      <div className="border border-slate-300 rounded-sm p-2 mb-2.5 bg-slate-50/80 text-[10px]">
        <div className="font-bold text-[10px] text-[#123F7A] uppercase tracking-wide border-b border-slate-200 pb-1 mb-1">
          Billed To (Details of Receiver / Farmer)
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p><span className="text-gray-600 font-medium inline-block w-20">Name:</span> <strong className="text-gray-900">{customerName}</strong></p>
            <p><span className="text-gray-600 font-medium inline-block w-20">Mobile:</span> <span className="font-semibold">{customerMobile || 'N/A'}</span></p>
            <p><span className="text-gray-600 font-medium inline-block w-20">Village / Town:</span> <span className="font-semibold">{customerVillage || 'Local'}</span></p>
          </div>
          <div className="space-y-0.5">
            <p><span className="text-gray-600 font-medium inline-block w-20">Address:</span> <span className="font-semibold">{customerAddress || 'Local Counter'}</span></p>
            <p><span className="text-gray-600 font-medium inline-block w-20">GSTIN / UID:</span> <span className="font-semibold">{customerGstin || 'Unregistered'}</span></p>
            <p><span className="text-gray-600 font-medium inline-block w-20">State:</span> <span className="font-semibold">{state} ({stateCode})</span></p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full text-left border-collapse border border-slate-300 mb-2.5 text-[10px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[9px] uppercase tracking-wider text-center">
            <th className="p-1.5 border border-slate-300 w-7">#</th>
            <th className="p-1.5 border border-slate-300 text-left">Description of Goods</th>
            <th className="p-1.5 border border-slate-300 w-16">HSN/SAC</th>
            <th className="p-1.5 border border-slate-300 w-24">Batch & Exp</th>
            <th className="p-1.5 border border-slate-300 w-14">Qty</th>
            <th className="p-1.5 border border-slate-300 w-16 text-right">Rate</th>
            <th className="p-1.5 border border-slate-300 w-14 text-right">Disc</th>
            <th className="p-1.5 border border-slate-300 w-18 text-right">Taxable</th>
            <th className="p-1.5 border border-slate-300 w-12 text-center">GST%</th>
            <th className="p-1.5 border border-slate-300 text-right w-20">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            let hsn = (item as any).hsn_sac;
            if (!hsn) {
              if (item.product_name?.toLowerCase().includes('urea') || item.product_name?.toLowerCase().includes('dap') || item.product_name?.toLowerCase().includes('potash') || item.unit === 'Bag') {
                hsn = '3102';
              } else if (item.tax_rate === 18 || item.unit === 'Bottle') {
                hsn = '3808';
              } else if (item.product_name?.toLowerCase().includes('seed') || item.tax_rate === 0) {
                hsn = '1209';
              } else {
                hsn = '3102';
              }
            }

            const disc = Number(item.discount_amount || 0);

            return (
              <tr key={idx} className="border-b border-slate-200 odd:bg-white even:bg-slate-50/50">
                <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                  {item.product_name}
                </td>
                <td className="p-1.5 border border-slate-300 text-center font-mono text-[9px]">{hsn}</td>
                <td className="p-1.5 border border-slate-300 text-center text-[9px]">
                  <strong className="text-slate-900">{item.batch_number || '-'}</strong>
                  {item.expiry_date && (
                    <div className="text-slate-500 text-[8.5px]">Exp: {item.expiry_date.substring(0, 7)}</div>
                  )}
                </td>
                <td className="p-1.5 border border-slate-300 text-center font-semibold">
                  {item.quantity} {item.unit}
                </td>
                <td className="p-1.5 border border-slate-300 text-right">₹{item.rate.toFixed(2)}</td>
                <td className="p-1.5 border border-slate-300 text-right text-slate-600">
                  {disc > 0 ? `₹${disc.toFixed(2)}` : '-'}
                </td>
                <td className="p-1.5 border border-slate-300 text-right">₹{item.taxable_amount.toFixed(2)}</td>
                <td className="p-1.5 border border-slate-300 text-center font-medium">{item.tax_rate}%</td>
                <td className="p-1.5 border border-slate-300 text-right font-bold text-slate-900">₹{item.total_amount.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary and Bank Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-2.5 text-[9.5px]">
        {/* Left: Bank Details & UPI */}
        <div className="border border-slate-300 rounded-sm p-2 bg-slate-50/80">
          <div className="font-bold text-[9.5px] text-[#123F7A] uppercase tracking-wide border-b border-slate-200 pb-1 mb-1">
            Bank Details for Direct RTGS/NEFT
          </div>
          <div className="space-y-0.5">
            <p><span className="text-gray-600 font-medium inline-block w-20">Bank Name:</span> <strong>{bankName}</strong></p>
            <p><span className="text-gray-600 font-medium inline-block w-20">Account No:</span> <strong>{accountNo}</strong></p>
            <p><span className="text-gray-600 font-medium inline-block w-20">IFSC Code:</span> <strong>{ifscCode}</strong></p>
            <p><span className="text-gray-600 font-medium inline-block w-20">UPI ID:</span> <strong>{upiId}</strong></p>
          </div>
          {sale.notes && (
            <div className="mt-1.5 text-slate-700 bg-white p-1 border border-slate-200 rounded text-[9px]">
              <strong>Notes:</strong> {sale.notes}
            </div>
          )}
        </div>

        {/* Right: Calculation breakdown */}
        <div className="border border-slate-300 rounded-sm p-2 bg-white space-y-1">
          <div className="flex justify-between text-gray-700">
            <span>Item Subtotal:</span>
            <span>₹{subtotal}</span>
          </div>
          {discountNum > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span>Total Discount:</span>
              <span>-₹{discount}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span>CGST (Central Tax):</span>
            <span>₹{cgst}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>SGST (State Tax):</span>
            <span>₹{sgst}</span>
          </div>
          {roundOffNum !== 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Round Off:</span>
              <span>{roundOffNum < 0 ? '-' : '+'}₹{Math.abs(roundOffNum).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-extrabold border-t-2 border-[#123F7A] pt-1 mt-1 text-[#123F7A]">
            <span>GRAND TOTAL:</span>
            <span>₹{grandTotal}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-slate-300 pt-1 text-green-800 font-bold">
            <span>Amount Paid:</span>
            <span>₹{paidAmount}</span>
          </div>
          {balanceDueNum > 0 && (
            <div className="flex justify-between font-bold text-rose-600">
              <span>Credit Balance Due:</span>
              <span>₹{balanceDue}</span>
            </div>
          )}
        </div>
      </div>

      {/* Terms and Signature Grid */}
      <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded-sm p-2 bg-slate-50/80 text-[9px]">
        <div>
          <div className="font-bold text-[9px] text-gray-900 border-b border-slate-200 pb-0.5 mb-1">Terms & Conditions</div>
          <p className="whitespace-pre-line text-gray-600 leading-normal">
            {terms}
          </p>
        </div>
        <div className="text-right flex flex-col justify-between h-14 pt-0.5">
          <div className="text-gray-900 text-[9.5px]">For <strong>{storeName}</strong></div>
          <div className="border-t border-gray-600 pt-1 inline-block w-36 self-end text-center font-bold text-gray-900">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
};
