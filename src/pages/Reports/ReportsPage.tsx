import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  BarChart3,
  Calendar,
  IndianRupee,
  Receipt,
  Package,
  Layers,
  FileText,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'tax' | 'inventory' | 'outstanding' | 'movements'>('sales');

  // Date filters
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));

  const [salesReport, setSalesReport] = useState<any>(null);
  const [taxReport, setTaxReport] = useState<any>(null);
  const [valuationReport, setValuationReport] = useState<any>(null);
  const [outstandingReport, setOutstandingReport] = useState<any>(null);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        if (activeTab === 'sales') {
          const data = await window.electronAPI.getSalesReport({ startDate, endDate });
          setSalesReport(data);
        } else if (activeTab === 'tax') {
          const data = await window.electronAPI.getTaxReport({ startDate, endDate });
          setTaxReport(data);
        } else if (activeTab === 'inventory') {
          const data = await window.electronAPI.getInventoryValuation();
          setValuationReport(data);
        } else if (activeTab === 'outstanding') {
          const data = await window.electronAPI.getCustomerOutstandingReport();
          setOutstandingReport(data);
        } else if (activeTab === 'movements') {
          const data = await window.electronAPI.getStockMovements({ limit: 100 });
          setStockMovements(data);
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, startDate, endDate]);

  return (
    <div className="space-y-4">
      {/* Top Navigation Strip */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Report Category Tabs */}
        <div className="flex items-center gap-1 bg-[#F3F5F8] dark:bg-[#202A35] p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'sales'
                ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'tax'
                ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            GST Tax Report
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'inventory'
                ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Stock Valuation
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'outstanding'
                ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Customer Udhaar
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'movements'
                ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Stock Movements
          </button>
        </div>

        {/* Date Filter Controls for Sales & Tax */}
        {(activeTab === 'sales' || activeTab === 'tax') && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10));
                setEndDate(now.toISOString().substring(0, 10));
              }}
            >
              This Month
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: SALES REPORT */}
      {activeTab === 'sales' && salesReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <StatCard
              label="Period Total Sales"
              value={`₹${(salesReport.summary?.total_sales || 0).toLocaleString('en-IN')}`}
              subtitle={`${salesReport.summary?.total_bills || 0} Invoices`}
              icon={<IndianRupee className="w-4 h-4" />}
            />
            <StatCard
              label="Total Collections"
              value={`₹${(salesReport.summary?.total_collected || 0).toLocaleString('en-IN')}`}
              subtitle="Cash / UPI / Card"
              icon={<IndianRupee className="w-4 h-4" />}
              iconBg="bg-green-100 text-[#3F7D4A] dark:bg-green-950/40 dark:text-green-400"
            />
            <StatCard
              label="Credit Given"
              value={`₹${(salesReport.summary?.total_credit || 0).toLocaleString('en-IN')}`}
              subtitle="Udhaar Balance"
              icon={<Receipt className="w-4 h-4" />}
              iconBg="bg-amber-100 text-[#C77700] dark:bg-amber-950/40 dark:text-amber-400"
            />
            <StatCard
              label="Avg Bill Value"
              value={`₹${Math.round(salesReport.summary?.average_bill_value || 0).toLocaleString('en-IN')}`}
              subtitle="Per Finalized Bill"
              icon={<BarChart3 className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Cols: Product Sales Table */}
            <Card title="Product-Wise Sales Analysis" className="lg:col-span-2" noPadding>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] dark:bg-[#151D26] sticky top-0 border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Qty Sold</th>
                      <th className="p-3 text-right">Taxable (₹)</th>
                      <th className="p-3 text-right">Tax (₹)</th>
                      <th className="p-3 text-right">Total Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {salesReport.productSales?.map((ps: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-3 font-semibold">{ps.product_name}</td>
                        <td className="p-3 text-gray-500">{ps.category}</td>
                        <td className="p-3 text-center font-bold">{ps.total_qty} {ps.unit}</td>
                        <td className="p-3 text-right">₹{ps.taxable_revenue.toFixed(2)}</td>
                        <td className="p-3 text-right">₹{ps.tax_amount.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                          ₹{ps.total_revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Right 1 Col: Category Share */}
            <Card title="Category Revenue Share">
              <div className="space-y-3">
                {salesReport.categorySales?.map((cat: any, i: number) => {
                  const total = salesReport.summary?.total_sales || 1;
                  const pct = Math.round((cat.total_revenue / total) * 100);
                  return (
                    <div key={i} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span>{cat.category}</span>
                        <span className="font-bold">₹{cat.total_revenue.toLocaleString('en-IN')} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#123F7A] dark:bg-[#6EA8FE] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: GST TAX REPORT */}
      {activeTab === 'tax' && taxReport && (
        <div className="space-y-4">
          <Card title="GST Slabs Breakdown (CGST & SGST)" subtitle={`Invoices from ${startDate} to ${endDate}`} noPadding>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                <tr>
                  <th className="p-3">GST Slab Rate</th>
                  <th className="p-3 text-center">Items Billed</th>
                  <th className="p-3 text-right">Taxable Value (₹)</th>
                  <th className="p-3 text-right">CGST (₹)</th>
                  <th className="p-3 text-right">SGST (₹)</th>
                  <th className="p-3 text-right">Total Tax (₹)</th>
                  <th className="p-3 text-right">Total Invoice Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {taxReport.taxSlabs?.map((slab: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-3 font-bold text-sm text-[#123F7A] dark:text-[#6EA8FE]">
                      {slab.tax_rate}% GST
                    </td>
                    <td className="p-3 text-center">{slab.item_count}</td>
                    <td className="p-3 text-right font-medium">₹{slab.total_taxable.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{slab.cgst.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{slab.sgst.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-[#3F7D4A]">₹{slab.total_tax.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold">₹{slab.total_with_tax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F3F5F8] dark:bg-[#202A35] font-bold border-t-2 border-gray-300 dark:border-gray-700">
                <tr>
                  <td className="p-3 text-sm">Totals:</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right">₹{(taxReport.totals?.grand_taxable || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">₹{(taxReport.totals?.grand_cgst || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">₹{(taxReport.totals?.grand_sgst || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-[#3F7D4A]">₹{(taxReport.totals?.grand_tax || 0).toFixed(2)}</td>
                  <td className="p-3 text-right text-sm text-[#123F7A] dark:text-[#6EA8FE]">
                    ₹{(taxReport.totals?.grand_total || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 3: INVENTORY VALUATION */}
      {activeTab === 'inventory' && valuationReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Purchase Value (Cost)"
              value={`₹${Math.round(valuationReport.summary?.total_purchase_value || 0).toLocaleString('en-IN')}`}
              subtitle={`${valuationReport.summary?.total_products || 0} active products in stock`}
              icon={<Package className="w-4 h-4" />}
            />
            <StatCard
              label="Selling Value (Retail)"
              value={`₹${Math.round(valuationReport.summary?.total_selling_value || 0).toLocaleString('en-IN')}`}
              subtitle="Expected counter realization"
              icon={<IndianRupee className="w-4 h-4" />}
              iconBg="bg-green-100 text-[#3F7D4A] dark:bg-green-950/40 dark:text-green-400"
            />
            <StatCard
              label="Estimated Gross Margin"
              value={`₹${Math.round(
                (valuationReport.summary?.total_selling_value || 0) -
                (valuationReport.summary?.total_purchase_value || 0)
              ).toLocaleString('en-IN')}`}
              subtitle="Retail value minus purchase cost"
              icon={<BarChart3 className="w-4 h-4" />}
              iconBg="bg-blue-100 text-[#123F7A] dark:bg-blue-950/40 dark:text-blue-300"
            />
          </div>

          <Card title="Category Stock Valuation" noPadding>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Products Count</th>
                  <th className="p-3 text-center">Units in Stock</th>
                  <th className="p-3 text-right">Purchase Cost (₹)</th>
                  <th className="p-3 text-right">Selling Value (₹)</th>
                  <th className="p-3 text-right">Margin (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {valuationReport.categoryValuation?.map((cv: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-3 font-semibold text-sm">{cv.category}</td>
                    <td className="p-3 text-center">{cv.product_count}</td>
                    <td className="p-3 text-center font-bold">{cv.stock_quantity}</td>
                    <td className="p-3 text-right">₹{cv.purchase_value.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                      ₹{cv.selling_value.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-medium text-[#3F7D4A]">
                      ₹{(cv.selling_value - cv.purchase_value).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 4: CUSTOMER OUTSTANDING */}
      {activeTab === 'outstanding' && outstandingReport && (
        <Card
          title="Customer Credit (Udhaar) Aging & Balances"
          subtitle={`Total Outstanding Debt: ₹${(outstandingReport.totalOutstanding || 0).toLocaleString('en-IN')}`}
          noPadding
        >
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
              <tr>
                <th className="p-3">Customer / Farm</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Village</th>
                <th className="p-3">Last Purchase Date</th>
                <th className="p-3 text-right">Credit Limit</th>
                <th className="p-3 text-right">Balance Due (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {outstandingReport.customers?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="p-3 font-bold">
                    {c.name}
                    {c.farm_name && <div className="text-[11px] font-normal text-gray-400">{c.farm_name}</div>}
                  </td>
                  <td className="p-3 font-mono">{c.mobile}</td>
                  <td className="p-3">{c.village || '-'}</td>
                  <td className="p-3 text-gray-500">{c.last_purchase_date?.substring(0, 10) || '-'}</td>
                  <td className="p-3 text-right text-gray-500">₹{(c.credit_limit || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-bold text-sm text-[#D64545]">
                    ₹{c.outstanding_balance.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* TAB 5: STOCK MOVEMENTS AUDIT */}
      {activeTab === 'movements' && (
        <Card title="Stock Movement Audit Trail" subtitle="Detailed audit ledger of sales deductions, purchase additions, and adjustments" noPadding>
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Batch #</th>
                <th className="p-3 text-center">Type</th>
                <th className="p-3 text-center">Change</th>
                <th className="p-3 text-center">Previous Stock</th>
                <th className="p-3 text-center">New Stock</th>
                <th className="p-3">Reason / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {stockMovements.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="p-3 text-gray-500 whitespace-nowrap">{m.created_at.substring(0, 16)}</td>
                  <td className="p-3 font-semibold">{m.product_name}</td>
                  <td className="p-3 font-mono">{m.batch_number || '-'}</td>
                  <td className="p-3 text-center">
                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold">
                    <span className={m.quantity_change > 0 ? 'text-[#3F7D4A]' : 'text-[#D64545]'}>
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-500">{m.previous_stock}</td>
                  <td className="p-3 text-center font-semibold">{m.new_stock}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{m.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
