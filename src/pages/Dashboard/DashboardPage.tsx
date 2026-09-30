import React, { useEffect, useState } from 'react';
import { DashboardSummary, Sale, StoreSettings } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PrintModal } from '../../components/invoice/PrintModal';
import {
  IndianRupee,
  Receipt,
  Wallet,
  AlertTriangle,
  Package,
  Clock,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: any) => void;
  settings: StoreSettings;
}

export const DashboardPage: React.FC<Props> = ({ onNavigate, settings }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getDashboardSummary();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handlePrintClick = async (sale: Sale) => {
    if (window.electronAPI) {
      const fullSale = await window.electronAPI.getSaleById(sale.id);
      setSelectedSaleForPrint(fullSale || sale);
    } else {
      setSelectedSaleForPrint(sale);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Natural Language Insight */}
      <div className="bg-gradient-to-r from-[#123F7A]/10 to-[#3F7D4A]/10 dark:from-[#123F7A]/20 dark:to-[#3F7D4A]/20 border border-[#123F7A]/20 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#3F7D4A] text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3F7D4A] dark:text-[#72B77E]">
                Today's Store Pulse
              </span>
            </div>
            <p className="text-sm font-medium text-[#1F2937] dark:text-[#F3F4F6] mt-0.5 leading-relaxed">
              {summary?.conciseInsightSummary || 'Loading store pulse and insights...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('insights')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Insights Engine
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('billing')}
          >
            Create Bill (F1)
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          label="Today's Sales"
          value={`₹${(summary?.todaySales || 0).toLocaleString('en-IN')}`}
          subtitle={`${summary?.billsTodayCount || 0} Bills Generated`}
          icon={<IndianRupee className="w-4 h-4" />}
          iconBg="bg-[#123F7A]/10 text-[#123F7A] dark:bg-[#6EA8FE]/20 dark:text-[#6EA8FE]"
        />

        <StatCard
          label="Today's Cash/UPI"
          value={`₹${(summary?.todayCollections || 0).toLocaleString('en-IN')}`}
          subtitle="Collections"
          icon={<Wallet className="w-4 h-4" />}
          iconBg="bg-[#3F7D4A]/10 text-[#3F7D4A] dark:bg-[#72B77E]/20 dark:text-[#72B77E]"
        />

        <StatCard
          label="Customer Due"
          value={`₹${(summary?.totalCustomerOutstanding || 0).toLocaleString('en-IN')}`}
          subtitle="Total Udhaar Balance"
          icon={<Receipt className="w-4 h-4" />}
          iconBg="bg-[#C77700]/10 text-[#C77700] dark:bg-[#E2A83B]/20 dark:text-[#E2A83B]"
          onClick={() => onNavigate('customers')}
        />

        <StatCard
          label="Stock Valuation"
          value={`₹${Math.round(summary?.currentInventoryValue || 0).toLocaleString('en-IN')}`}
          subtitle="Total Purchase Value"
          icon={<Package className="w-4 h-4" />}
          iconBg="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          onClick={() => onNavigate('reports')}
        />

        <StatCard
          label="Low Stock Items"
          value={summary?.lowStockCount || 0}
          subtitle="Below Reorder Threshold"
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBg="bg-amber-100 text-[#C77700] dark:bg-amber-950/40 dark:text-amber-400"
          onClick={() => onNavigate('products')}
        />

        <StatCard
          label="Expiring Batches"
          value={summary?.expiringStockCount || 0}
          subtitle="Within 60 Days"
          icon={<Clock className="w-4 h-4" />}
          iconBg="bg-rose-100 text-[#D64545] dark:bg-rose-950/40 dark:text-rose-400"
          onClick={() => onNavigate('products')}
        />
      </div>

      {/* High Priority Alerts (if any) */}
      {summary?.highPriorityAlerts && summary.highPriorityAlerts.length > 0 && (
        <div className="space-y-2">
          {summary.highPriorityAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                alert.severity === 'danger'
                  ? 'bg-[#FEF2F2] border-[#D64545]/20 text-[#D64545] dark:bg-[#2E1414] dark:text-[#F06B6B]'
                  : 'bg-[#FFF7ED] border-[#C77700]/20 text-[#C77700] dark:bg-[#2E2010] dark:text-[#E2A83B]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{alert.title}:</strong> {alert.message}
                </span>
              </div>
              <button
                onClick={() => onNavigate(alert.type === 'stock' || alert.type === 'expiry' ? 'products' : 'customers')}
                className="font-bold underline hover:no-underline shrink-0 ml-4 cursor-pointer"
              >
                Take Action →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Two Columns: Recent Invoices & Top Products Today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Transactions */}
        <Card
          title="Recent Transactions"
          subtitle="Latest counter sales and physical print status"
          className="lg:col-span-2"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('invoices')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All Bills
            </Button>
          }
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3F5F8] dark:bg-[#202A35] text-[#667085] dark:text-[#AAB4C0] border-b border-[#E1E5EA] dark:border-[#303B47]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold">Time</th>
                  <th className="py-2.5 px-4 font-semibold">Mode</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Print Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5EA] dark:divide-[#303B47]">
                {summary?.recentSales && summary.recentSales.length > 0 ? (
                  summary.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2836] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#123F7A] dark:text-[#6EA8FE]">
                        {sale.invoice_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#1F2937] dark:text-[#F3F4F6]">{sale.customer_name}</div>
                        {sale.customer_village && (
                          <div className="text-[11px] text-[#667085] dark:text-[#AAB4C0]">{sale.customer_village}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#667085] dark:text-[#AAB4C0]">
                        {sale.sale_date.substring(11, 16)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[11px] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#1F2937] dark:text-[#F3F4F6]">
                        ₹{sale.grand_total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {sale.print_status === 'printed' ? (
                          <Badge variant="success" size="sm">Printed</Badge>
                        ) : sale.print_status === 'failed' ? (
                          <Badge variant="danger" size="sm">Failed / Retry</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Pending</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePrintClick(sale)}
                          icon={<Printer className="w-3.5 h-3.5" />}
                        >
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No transactions recorded yet today. Click "Create Bill" to start billing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right 1 Col: Top Products Snapshot */}
        <Card
          title="Top Items Today"
          subtitle="Highest sales volume on counter"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('reports')}
            >
              Reports
            </Button>
          }
        >
          {summary?.topProductsToday && summary.topProductsToday.length > 0 ? (
            <div className="space-y-3">
              {summary.topProductsToday.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-800 pb-2">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-[#1F2937] dark:text-[#F3F4F6] truncate">
                      {p.product_name}
                    </p>
                    <p className="text-[11px] text-[#667085] dark:text-[#AAB4C0]">
                      Qty: {p.quantity} Units Sold
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-500">
              <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No items billed yet today.
            </div>
          )}
        </Card>
      </div>

      {/* Mandatory Print Modal when triggered */}
      {selectedSaleForPrint && (
        <PrintModal
          isOpen={true}
          onClose={() => {
            setSelectedSaleForPrint(null);
            fetchDashboard();
          }}
          sale={selectedSaleForPrint}
          settings={settings}
        />
      )}
    </div>
  );
};
