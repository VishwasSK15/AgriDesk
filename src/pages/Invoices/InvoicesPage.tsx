import React, { useState, useEffect } from 'react';
import { Sale, StoreSettings } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PrintModal } from '../../components/invoice/PrintModal';
import { toast } from '../../store/toastStore';
import {
  Search,
  Printer,
  Eye,
  RotateCcw,
  Calendar,
  Filter,
  Receipt,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  settings: StoreSettings;
}

export const InvoicesPage: React.FC<Props> = ({ settings }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.getSales({
          searchQuery,
          status: statusFilter,
          paymentMethod: paymentFilter,
          startDate,
          endDate,
          limit: 100,
        });
        setSales(res.sales);
        setTotalCount(res.totalCount);
      }
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [searchQuery, statusFilter, paymentFilter, startDate, endDate]);

  const handleViewInvoice = async (sale: Sale) => {
    if (window.electronAPI) {
      const full = await window.electronAPI.getSaleById(sale.id);
      setSelectedSaleForView(full || sale);
    } else {
      setSelectedSaleForView(sale);
    }
  };

  const handleReprint = async (sale: Sale) => {
    if (window.electronAPI) {
      const full = await window.electronAPI.getSaleById(sale.id);
      setSelectedSaleForPrint(full || sale);
    } else {
      setSelectedSaleForPrint(sale);
    }
  };

  const handleCancelSale = async () => {
    if (!cancelModalSale || !cancelReason.trim()) {
      toast.warning('Please provide a reason for cancelling this invoice.');
      return;
    }

    setIsCancelling(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.cancelSale({
          saleId: cancelModalSale.id,
          reason: cancelReason,
        });

        if (res.success) {
          toast.success(`Sale ${cancelModalSale.invoice_number} cancelled and inventory restored.`);
          setCancelModalSale(null);
          setCancelReason('');
          fetchSales();
        } else {
          toast.error(res.error || 'Failed to cancel sale');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing cancellation');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Guidance Banner */}
      <div className="bg-[#EDF7EE] dark:bg-[#1A2E20] border border-[#2D6A4F]/25 dark:border-[#72B77E]/25 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#166534] dark:text-[#86EFAC] gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold">🧾 Tax Invoices & POS Receipts:</span>
          <span>Review completed sales, track physical print job status, manage customer credit balances, and re-print or export invoices to PDF.</span>
        </div>
      </div>

      {/* Top Header & Search Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            placeholder="Search Invoice #, Customer, Mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-[#D1D5DB] dark:border-[#374151] rounded-lg bg-white dark:bg-[#18212B] text-xs font-semibold text-gray-800 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-10 px-3 border border-[#D1D5DB] dark:border-[#374151] rounded-lg bg-white dark:bg-[#18212B] text-xs font-semibold text-gray-800 dark:text-slate-200"
          >
            <option value="">All Payment Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit">Credit (Udhaar)</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 px-2.5 border border-[#D1D5DB] dark:border-[#374151] rounded-lg bg-white dark:bg-[#18212B] text-xs font-semibold text-gray-800 dark:text-slate-200"
          />
          <span className="text-gray-500 font-medium">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 px-2.5 border border-[#D1D5DB] dark:border-[#374151] rounded-lg bg-white dark:bg-[#18212B] text-xs font-semibold text-gray-800 dark:text-slate-200"
          />

          {(searchQuery || statusFilter || paymentFilter || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPaymentFilter('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-[#F4F6F9] dark:bg-[#202A35] border-b border-[#D1D5DB] dark:border-[#374151] flex items-center justify-between text-xs font-bold text-gray-700 dark:text-slate-200">
          <span>Total Invoices Found: {totalCount}</span>
          <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400">Displaying recent 100 entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] dark:bg-[#151D26] text-gray-700 dark:text-slate-200 border-b border-[#D1D5DB] dark:border-[#374151] font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-bold">Invoice No</th>
                <th className="py-2.5 px-4 font-bold">Date & Time</th>
                <th className="py-2.5 px-4 font-bold">Customer Details</th>
                <th className="py-2.5 px-4 font-bold">Mode</th>
                <th className="py-2.5 px-4 font-bold text-right">Total (₹)</th>
                <th className="py-2.5 px-4 font-bold text-right">Balance Due</th>
                <th className="py-2.5 px-4 font-bold text-center">Status</th>
                <th className="py-2.5 px-4 font-bold text-center">Print Status</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1D5DB] dark:divide-[#374151]">
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2836] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                      {sale.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {sale.sale_date.substring(0, 16)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#111827] dark:text-[#F9FAFB]">{sale.customer_name}</div>
                      <div className="text-[11px] text-gray-700 dark:text-slate-300 font-medium">
                        {sale.customer_mobile || 'No Mobile'} {sale.customer_village ? `• ${sale.customer_village}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-2 py-0.5 rounded">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#111827] dark:text-[#F9FAFB]">
                      ₹{sale.grand_total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {sale.balance_due > 0 ? (
                        <span className="text-[#DC2626] dark:text-[#F87171] font-bold">
                          ₹{sale.balance_due.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-[#166534] dark:text-[#86EFAC] font-bold">Paid</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.status === 'completed' ? (
                        <Badge variant="success" size="sm">Completed</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">Cancelled</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.print_status === 'printed' ? (
                        <Badge variant="success" size="sm">
                          Printed ({sale.print_count})
                        </Badge>
                      ) : sale.print_status === 'failed' ? (
                        <Badge variant="danger" size="sm">Failed / Retry</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Pending</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInvoice(sale)}
                          title="View Bill Details"
                          icon={<Eye className="w-3.5 h-3.5" />}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleReprint(sale)}
                          title="Reprint Bill"
                          icon={<Printer className="w-3.5 h-3.5 text-[#123F7A]" />}
                        >
                          Reprint
                        </Button>
                        {sale.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelModalSale(sale)}
                            title="Cancel / Return Sale"
                            className="text-[#D64545] hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            icon={<RotateCcw className="w-3.5 h-3.5" />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No sales invoices matched your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Details Modal */}
      {selectedSaleForView && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForView(null)}
          title={`Invoice ${selectedSaleForView.invoice_number}`}
          subtitle={`Billed to ${selectedSaleForView.customer_name} on ${selectedSaleForView.sale_date.substring(0, 16)}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-gray-500">
                Print Status: <strong className="uppercase">{selectedSaleForView.print_status}</strong> (Printed {selectedSaleForView.print_count} times)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    const s = selectedSaleForView;
                    setSelectedSaleForView(null);
                    setSelectedSaleForPrint(s);
                  }}
                  icon={<Printer className="w-4 h-4" />}
                >
                  Print Bill
                </Button>
                <Button variant="secondary" size="md" onClick={() => setSelectedSaleForView(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Customer Details Box */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
              <div>
                <p><strong>Customer:</strong> {selectedSaleForView.customer_name}</p>
                <p><strong>Mobile:</strong> {selectedSaleForView.customer_mobile || 'N/A'}</p>
                <p><strong>Village:</strong> {selectedSaleForView.customer_village || '-'}</p>
              </div>
              <div>
                <p><strong>Payment Mode:</strong> <span className="uppercase font-bold">{selectedSaleForView.payment_method}</span></p>
                <p><strong>Paid Amount:</strong> ₹{selectedSaleForView.paid_amount.toFixed(2)}</p>
                <p><strong>Balance Due:</strong> ₹{selectedSaleForView.balance_due.toFixed(2)}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border border-[#E1E5EA] dark:border-[#303B47] rounded-lg overflow-hidden">
              <thead className="bg-[#F3F5F8] dark:bg-[#202A35] font-semibold text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2">Batch</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-right">Tax</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {selectedSaleForView.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="p-2 font-medium">{item.product_name}</td>
                    <td className="p-2 font-mono text-[11px]">{item.batch_number || '-'}</td>
                    <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                    <td className="p-2 text-right">₹{item.rate.toFixed(2)}</td>
                    <td className="p-2 text-right">₹{item.tax_amount.toFixed(2)}</td>
                    <td className="p-2 text-right font-bold">₹{item.total_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg flex justify-between items-center text-sm font-bold">
              <span>Grand Total</span>
              <span className="text-[#123F7A] dark:text-[#6EA8FE]">
                ₹{selectedSaleForView.grand_total.toFixed(2)}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Sale Confirmation Modal */}
      {cancelModalSale && (
        <Modal
          isOpen={true}
          onClose={() => setCancelModalSale(null)}
          title={`Cancel Sale ${cancelModalSale.invoice_number}`}
          subtitle="This action will reverse the inventory and credit balance."
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelModalSale(null)}>
                Dismiss
              </Button>
              <Button
                variant="danger"
                isLoading={isCancelling}
                onClick={handleCancelSale}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Confirm Cancellation
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-[#D64545] dark:text-[#F06B6B] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Cancelling this sale will restore stock quantities for all line items back into product and batch inventory. An audit record will be preserved.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Reason for Cancellation *</label>
              <textarea
                rows={3}
                placeholder="e.g. Customer returned goods / Wrong billing quantity entered..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B] text-xs focus:ring-1 focus:ring-[#D64545]"
                required
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Mandatory Reprint Modal */}
      {selectedSaleForPrint && (
        <PrintModal
          isOpen={true}
          onClose={() => {
            setSelectedSaleForPrint(null);
            fetchSales();
          }}
          sale={selectedSaleForPrint}
          settings={settings}
        />
      )}
    </div>
  );
};
