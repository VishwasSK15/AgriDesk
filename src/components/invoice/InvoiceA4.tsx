import React from 'react';
import { Sale, StoreSettings } from '../../types';

interface Props {
  sale: Sale;
  settings: StoreSettings;
}

export const InvoiceA4: React.FC<Props> = ({ sale, settings }) => {
  return (
    <div className="w-[794px] min-h-[1050px] p-8 bg-white text-black font-sans text-xs select-text mx-auto border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-4">
      {/* Title */}
      <div className="text-center font-bold text-sm tracking-wide uppercase border-b-2 border-black pb-1 mb-2">
        Tax Invoice / Cash Memo (Agricultural Inputs)
      </div>

      {/* Header Grid */}
      <div className="grid grid-cols-2 border border-black p-3 mb-2 gap-4">
        {/* Seller Info */}
        <div>
          <h1 className="text-base font-bold text-[#123F7A]">{settings.store_name}</h1>
          {settings.tagline && <p className="text-[11px] font-semibold text-gray-700">{settings.tagline}</p>}
          <p className="text-[11px] text-gray-800 mt-1">{settings.address}</p>
          <p className="text-[11px] text-gray-800">Phone: {settings.mobile} | Email: {settings.email || '-'}</p>
          <div className="mt-2 text-[11px] space-y-0.5">
            <p><strong>GSTIN:</strong> {settings.gstin}</p>
            <p><strong>State & Code:</strong> {settings.state} ({settings.state_code || '29'})</p>
            {settings.dl_number_1 && <p><strong>Pesticide Lic No:</strong> {settings.dl_number_1}</p>}
            {settings.dl_number_2 && <p><strong>Fertilizer Lic No:</strong> {settings.dl_number_2}</p>}
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="text-right border-l border-gray-300 pl-4 space-y-1 text-[11px]">
          <div className="bg-gray-100 p-2 border border-gray-300 rounded mb-2">
            <p className="text-xs">Invoice Number:</p>
            <p className="text-sm font-bold text-[#123F7A]">{sale.invoice_number}</p>
          </div>
          <p><strong>Invoice Date:</strong> {sale.sale_date.substring(0, 10)}</p>
          <p><strong>Place of Supply:</strong> {sale.customer_village || settings.state}</p>
          <p><strong>Payment Mode:</strong> <span className="uppercase font-semibold">{sale.payment_method}</span></p>
          <p><strong>Reverse Charge:</strong> No</p>
        </div>
      </div>

      {/* Buyer Info */}
      <div className="border border-black p-2.5 mb-2 bg-gray-50/50 text-[11px]">
        <div className="font-bold text-xs border-b border-gray-300 pb-1 mb-1 text-gray-800">
          Details of Receiver / Billed to (Farmer / Customer):
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Name:</strong> {sale.customer_name}</p>
            <p><strong>Mobile:</strong> {sale.customer_mobile || 'N/A'}</p>
            {sale.customer_village && <p><strong>Village / Town:</strong> {sale.customer_village}</p>}
          </div>
          <div>
            {sale.customer_address && <p><strong>Address:</strong> {sale.customer_address}</p>}
            <p><strong>GSTIN / UID:</strong> {sale.customer_gstin || 'Unregistered'}</p>
            <p><strong>State:</strong> {settings.state}</p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full text-left border border-black mb-2 text-[10.5px]">
        <thead>
          <tr className="bg-gray-100 border-b border-black font-semibold text-center">
            <th className="p-1.5 border-r border-black w-8">#</th>
            <th className="p-1.5 border-r border-black text-left">Description of Goods</th>
            <th className="p-1.5 border-r border-black w-18">HSN/SAC</th>
            <th className="p-1.5 border-r border-black w-20">Batch & Exp</th>
            <th className="p-1.5 border-r border-black w-14">Qty</th>
            <th className="p-1.5 border-r border-black w-16 text-right">Rate</th>
            <th className="p-1.5 border-r border-black w-14 text-right">Disc</th>
            <th className="p-1.5 border-r border-black w-18 text-right">Taxable</th>
            <th className="p-1.5 border-r border-black w-12 text-center">GST%</th>
            <th className="p-1.5 text-right w-20">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
              <td className="p-1.5 border-r border-black font-semibold">
                {item.product_name}
              </td>
              <td className="p-1.5 border-r border-black text-center">{item.unit === 'Bag' ? '3102' : '3808'}</td>
              <td className="p-1.5 border-r border-black text-center text-[9.5px]">
                {item.batch_number || '-'}<br />
                {item.expiry_date ? `Exp: ${item.expiry_date.substring(0, 7)}` : ''}
              </td>
              <td className="p-1.5 border-r border-black text-center font-medium">
                {item.quantity} {item.unit}
              </td>
              <td className="p-1.5 border-r border-black text-right">₹{item.rate.toFixed(2)}</td>
              <td className="p-1.5 border-r border-black text-right">{item.discount_amount ? `₹${item.discount_amount}` : '-'}</td>
              <td className="p-1.5 border-r border-black text-right">₹{item.taxable_amount.toFixed(2)}</td>
              <td className="p-1.5 border-r border-black text-center">{item.tax_rate}%</td>
              <td className="p-1.5 text-right font-bold">₹{item.total_amount.toFixed(2)}</td>
            </tr>
          ))}
          {/* Fill remaining empty rows for clean professional look */}
          {Array.from({ length: Math.max(0, 5 - (sale.items?.length || 0)) }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-gray-100 text-transparent select-none">
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary and Bank Details Grid */}
      <div className="grid grid-cols-2 gap-4 border border-black p-3 mb-2 text-[10.5px]">
        {/* Left: Bank Details & UPI */}
        <div>
          <div className="font-bold text-xs border-b border-gray-300 pb-1 mb-1">
            Bank Details for Direct RTGS/NEFT:
          </div>
          <div className="space-y-0.5">
            <p><strong>Bank Name:</strong> {settings.bank_name || 'State Bank of India'}</p>
            <p><strong>A/C No:</strong> {settings.account_number || '30123456789'}</p>
            <p><strong>IFSC Code:</strong> {settings.ifsc_code || 'SBIN0001234'}</p>
            <p><strong>UPI ID:</strong> {settings.upi_id || 'annapurna@sbi'}</p>
          </div>
          {sale.notes && (
            <div className="mt-2 text-gray-700 bg-gray-50 p-1.5 border border-gray-200 rounded">
              <strong>Notes:</strong> {sale.notes}
            </div>
          )}
        </div>

        {/* Right: Calculation breakdown */}
        <div className="space-y-1 text-right border-l border-gray-300 pl-4">
          <div className="flex justify-between">
            <span>Total Item Subtotal:</span>
            <span>₹{sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.total_discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Total Discount:</span>
              <span>-₹{sale.total_discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>CGST (Central Tax):</span>
            <span>₹{(sale.tax_amount / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST (State Tax):</span>
            <span>₹{(sale.tax_amount / 2).toFixed(2)}</span>
          </div>
          {sale.round_off !== 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Round Off:</span>
              <span>₹{sale.round_off.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t-2 border-black pt-1 mt-1 text-[#123F7A]">
            <span>GRAND TOTAL:</span>
            <span>₹{sale.grand_total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-gray-300 pt-1 text-gray-800">
            <span>Amount Paid:</span>
            <span className="font-semibold">₹{sale.paid_amount.toFixed(2)}</span>
          </div>
          {sale.balance_due > 0 && (
            <div className="flex justify-between font-bold text-[#D64545]">
              <span>Credit Balance Due:</span>
              <span>₹{sale.balance_due.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Terms and Signature Grid */}
      <div className="grid grid-cols-2 gap-4 border border-black p-3 text-[10px]">
        <div>
          <div className="font-bold border-b border-gray-300 pb-0.5 mb-1">Terms & Conditions:</div>
          <p className="whitespace-pre-line text-gray-700 leading-normal">
            {settings.terms_and_conditions || '1. Goods once sold will not be returned.\n2. Store seed and chemical products in cool dry place.\n3. Subject to local jurisdiction.'}
          </p>
        </div>
        <div className="text-right flex flex-col justify-between h-20 pt-1">
          <div>For <strong>{settings.store_name}</strong></div>
          <div className="border-t border-black pt-1 inline-block w-44 self-end text-center font-semibold">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
};
