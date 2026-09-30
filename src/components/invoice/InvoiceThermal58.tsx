import React from 'react';
import { Sale, StoreSettings } from '../../types';

interface Props {
  sale: Sale;
  settings: StoreSettings;
}

export const InvoiceThermal58: React.FC<Props> = ({ sale, settings }) => {
  return (
    <div className="w-[220px] p-2 bg-white text-black font-mono text-[9px] leading-tight select-text mx-auto border border-dashed border-gray-300">
      {/* Header */}
      <div className="text-center pb-1.5 border-b border-black">
        <h1 className="text-xs font-bold uppercase">{settings.store_name}</h1>
        <p className="text-[8px]">{settings.address}</p>
        <p className="text-[8px]">Ph: {settings.mobile}</p>
        {settings.gstin && <p className="text-[8px] font-bold">GST: {settings.gstin}</p>}
      </div>

      {/* Meta */}
      <div className="py-1 border-b border-black text-[8px]">
        <div className="flex justify-between">
          <span>Inv: <strong>{sale.invoice_number}</strong></span>
          <span>{sale.sale_date.substring(0, 10)}</span>
        </div>
        <div>To: {sale.customer_name} {sale.customer_mobile ? `(${sale.customer_mobile})` : ''}</div>
      </div>

      {/* Items */}
      <table className="w-full text-left my-1.5 border-b border-black text-[8px]">
        <thead>
          <tr className="border-b border-black font-bold">
            <th>Item</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item, idx) => (
            <React.Fragment key={idx}>
              <tr>
                <td colSpan={3} className="pt-1 font-semibold truncate max-w-[200px]">
                  {item.product_name}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="text-[7.5px] text-gray-700 pl-0.5 pb-0.5">
                  @{item.rate} {item.batch_number ? `B:${item.batch_number}` : ''}
                </td>
                <td className="text-center pb-0.5">{item.quantity}</td>
                <td className="text-right pb-0.5 font-bold">₹{item.total_amount.toFixed(1)}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="space-y-0.5 text-[8.5px] pb-1.5 border-b border-black">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{sale.subtotal.toFixed(1)}</span>
        </div>
        {sale.total_discount > 0 && (
          <div className="flex justify-between">
            <span>Disc:</span>
            <span>-₹{sale.total_discount.toFixed(1)}</span>
          </div>
        )}
        <div className="flex justify-between text-[10px] font-bold pt-0.5 border-t border-dashed border-black">
          <span>TOTAL:</span>
          <span>₹{sale.grand_total.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid ({sale.payment_method}):</span>
          <span>₹{sale.paid_amount.toFixed(1)}</span>
        </div>
        {sale.balance_due > 0 && (
          <div className="flex justify-between font-bold text-[#D64545]">
            <span>Due:</span>
            <span>₹{sale.balance_due.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="text-center pt-1 text-[7.5px]">
        <p>Thank You • Visit Again</p>
      </div>
    </div>
  );
};
