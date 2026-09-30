import React from 'react';
import { Sale, StoreSettings } from '../../types';

interface Props {
  sale: Sale;
  settings: StoreSettings;
}

export const InvoiceThermal80: React.FC<Props> = ({ sale, settings }) => {
  return (
    <div className="w-[300px] p-3 bg-white text-black font-mono text-[11px] leading-tight select-text mx-auto border border-dashed border-gray-300">
      {/* Header */}
      <div className="text-center pb-2 border-b border-black">
        <h1 className="text-sm font-bold uppercase">{settings.store_name}</h1>
        {settings.tagline && <p className="text-[10px]">{settings.tagline}</p>}
        <p className="text-[10px]">{settings.address}</p>
        <p className="text-[10px]">Ph: {settings.mobile}</p>
        {settings.gstin && <p className="text-[10px] font-semibold">GSTIN: {settings.gstin}</p>}
        {settings.dl_number_1 && <p className="text-[9px]">Pest Lic: {settings.dl_number_1}</p>}
        {settings.dl_number_2 && <p className="text-[9px]">Fert Lic: {settings.dl_number_2}</p>}
      </div>

      {/* Bill Meta */}
      <div className="py-2 border-b border-black text-[10px]">
        <div className="flex justify-between">
          <span>Bill No: <strong className="font-bold">{sale.invoice_number}</strong></span>
          <span>Date: {sale.sale_date.substring(0, 10)}</span>
        </div>
        <div className="flex justify-between mt-0.5">
          <span>Cust: {sale.customer_name}</span>
          <span>{sale.customer_mobile ? `Ph: ${sale.customer_mobile}` : ''}</span>
        </div>
        {sale.customer_village && (
          <div>Place: {sale.customer_village}</div>
        )}
        {sale.customer_gstin && (
          <div>Cust GSTIN: {sale.customer_gstin}</div>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full text-left my-2 border-b border-black text-[10px]">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="py-1">Item</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Rate</th>
            <th className="py-1 text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item, idx) => (
            <React.Fragment key={idx}>
              <tr>
                <td colSpan={4} className="pt-1 font-semibold truncate max-w-[280px]">
                  {item.product_name}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="text-[9px] text-gray-700 pl-1 pb-1">
                  {item.batch_number ? `B:${item.batch_number}` : ''} {item.expiry_date ? `Exp:${item.expiry_date.substring(0, 7)}` : ''}
                </td>
                <td className="text-center pb-1">{item.quantity} {item.unit}</td>
                <td className="text-right pb-1">₹{item.rate.toFixed(1)}</td>
                <td className="text-right pb-1 font-semibold">₹{item.total_amount.toFixed(2)}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="space-y-1 text-[10px] pb-2 border-b border-black">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{sale.subtotal.toFixed(2)}</span>
        </div>
        {sale.total_discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-₹{sale.total_discount.toFixed(2)}</span>
          </div>
        )}
        {sale.tax_amount > 0 && (
          <div className="flex justify-between">
            <span>GST Included:</span>
            <span>₹{sale.tax_amount.toFixed(2)}</span>
          </div>
        )}
        {sale.round_off !== 0 && (
          <div className="flex justify-between">
            <span>Round Off:</span>
            <span>₹{sale.round_off.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{sale.grand_total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="py-2 border-b border-black text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Payment Mode:</span>
          <span className="font-semibold uppercase">{sale.payment_method}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid Amount:</span>
          <span className="font-semibold">₹{sale.paid_amount.toFixed(2)}</span>
        </div>
        {sale.balance_due > 0 && (
          <div className="flex justify-between text-[#D64545] font-bold">
            <span>Balance Due:</span>
            <span>₹{sale.balance_due.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-2 text-[9px] space-y-1">
        <p className="font-semibold">Thank You! Visit Again</p>
        <p className="text-[8px] text-gray-700">Goods once sold cannot be returned without original bill.</p>
        {settings.upi_id && <p className="text-[8px]">UPI: {settings.upi_id}</p>}
      </div>
    </div>
  );
};
