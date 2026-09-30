import React, { useState, useEffect } from 'react';
import { SalesInsightReport, InventoryInsightReport } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Package,
  Layers,
  ShoppingBag,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: any) => void;
}

export const InsightsPage: React.FC<Props> = ({ onNavigate }) => {
  const [insightTab, setInsightTab] = useState<'sales' | 'inventory'>('sales');
  const [salesPeriod, setSalesPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

  const [salesInsights, setSalesInsights] = useState<SalesInsightReport | null>(null);
  const [inventoryInsights, setInventoryInsights] = useState<InventoryInsightReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        if (insightTab === 'sales') {
          const data = await window.electronAPI.getSalesInsights(salesPeriod);
          setSalesInsights(data);
        } else {
          const data = await window.electronAPI.getInventoryInsights();
          setInventoryInsights(data);
        }
      }
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [insightTab, salesPeriod]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Switcher */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#E1E5EA] dark:border-[#303B47] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3F7D4A]/10 text-[#3F7D4A] dark:bg-[#72B77E]/20 dark:text-[#72B77E] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F2937] dark:text-[#F3F4F6] flex items-center gap-2">
              Business Intelligence & Insights Engine
              <Badge variant="success" size="sm">Deterministic & Traceable</Badge>
            </h2>
            <p className="text-xs text-[#667085] dark:text-[#AAB4C0] mt-0.5">
              Explainable trends and replenishment recommendations derived strictly from recorded store transactions
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F3F5F8] dark:bg-[#202A35] p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setInsightTab('sales')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                insightTab === 'sales'
                  ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Sales Insights
            </button>
            <button
              onClick={() => setInsightTab('inventory')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                insightTab === 'inventory'
                  ? 'bg-white dark:bg-[#18212B] text-[#3F7D4A] dark:text-[#72B77E] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Inventory Health
            </button>
          </div>

          {insightTab === 'sales' && (
            <select
              value={salesPeriod}
              onChange={(e) => setSalesPeriod(e.target.value as any)}
              className="h-9 px-3 border border-[#E1E5EA] dark:border-[#303B47] rounded-lg bg-white dark:bg-[#18212B] text-xs font-semibold"
            >
              <option value="today">Today vs Yesterday</option>
              <option value="week">Past 7 Days vs Prior</option>
              <option value="month">This Month vs Last Month</option>
              <option value="year">This Year vs Last Year</option>
            </select>
          )}
        </div>
      </div>

      {/* SALES INSIGHTS TAB */}
      {insightTab === 'sales' && salesInsights && (
        <div className="space-y-4">
          {/* Natural Language Observations Box */}
          <div className="bg-gradient-to-r from-[#123F7A]/5 to-[#3F7D4A]/5 dark:from-[#123F7A]/15 dark:to-[#3F7D4A]/15 border border-[#123F7A]/15 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#123F7A] dark:text-[#6EA8FE] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#3F7D4A]" />
              Measured Observations ({salesPeriod.toUpperCase()})
            </div>
            <div className="space-y-1.5">
              {salesInsights.insightsText.map((text, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-[#1F2937] dark:text-[#F3F4F6] font-medium leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F7D4A] mt-1.5 shrink-0"></span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <StatCard
              label="Current Period Sales"
              value={`₹${salesInsights.currentSales.toLocaleString('en-IN')}`}
              subtitle={`${salesInsights.invoicesCount} Finalized Invoices`}
              icon={<TrendingUp className="w-4 h-4" />}
              trend={{
                value: Math.abs(salesInsights.salesGrowthPercent),
                isPositive: salesInsights.salesGrowthPercent >= 0,
              }}
            />

            <StatCard
              label="Previous Comparable"
              value={`₹${salesInsights.previousSales.toLocaleString('en-IN')}`}
              subtitle="Prior benchmark period"
              icon={<Calendar className="w-4 h-4" />}
            />

            <StatCard
              label="Average Bill Value"
              value={`₹${salesInsights.averageBillValue.toLocaleString('en-IN')}`}
              subtitle="Per customer transaction"
              icon={<ShoppingBag className="w-4 h-4" />}
            />

            <StatCard
              label="Credit (Udhaar) Share"
              value={`${salesInsights.creditVsPaid.creditPercent}%`}
              subtitle={`₹${salesInsights.creditVsPaid.creditAmount.toLocaleString('en-IN')} pending`}
              icon={<AlertTriangle className="w-4 h-4" />}
              iconBg="bg-amber-100 text-[#C77700] dark:bg-amber-950/40 dark:text-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products by Revenue */}
            <Card
              title="Top Products Driving Revenue"
              subtitle="Ranked by gross sales in selected period"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('reports')}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  View Full Report
                </Button>
              }
              noPadding
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Qty Sold</th>
                    <th className="p-3 text-right">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {salesInsights.topProducts.length > 0 ? (
                    salesInsights.topProducts.map((p) => (
                      <tr key={p.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-3 font-semibold">{p.name}</td>
                        <td className="p-3 text-gray-500">{p.category}</td>
                        <td className="p-3 text-center font-bold">{p.quantity}</td>
                        <td className="p-3 text-right font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                          ₹{p.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        Not enough sales records in this period to rank products.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* Category Sales Contribution */}
            <Card
              title="Category Sales Contribution"
              subtitle="Share of revenue across product segments"
            >
              <div className="space-y-4">
                {salesInsights.categoryShare.map((c, i) => (
                  <div key={i} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>{c.category}</span>
                      <span>₹{c.revenue.toLocaleString('en-IN')} ({c.percentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#123F7A] dark:bg-[#6EA8FE] rounded-full transition-all"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* INVENTORY HEALTH TAB */}
      {insightTab === 'inventory' && inventoryInsights && (
        <div className="space-y-4">
          {/* Natural Language Health Observations */}
          <div className="bg-gradient-to-r from-[#3F7D4A]/5 to-[#123F7A]/5 dark:from-[#3F7D4A]/15 dark:to-[#123F7A]/15 border border-[#3F7D4A]/20 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3F7D4A] dark:text-[#72B77E] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Inventory Health Diagnostics
            </div>
            <div className="space-y-1.5">
              {inventoryInsights.insightsText.map((text, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-[#1F2937] dark:text-[#F3F4F6] font-medium leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F7D4A] mt-1.5 shrink-0"></span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <StatCard
              label="Total Stock Valuation"
              value={`₹${Math.round(inventoryInsights.totalStockValue).toLocaleString('en-IN')}`}
              subtitle={`${inventoryInsights.activeProductsCount} catalog items`}
              icon={<Package className="w-4 h-4" />}
            />

            <StatCard
              label="Below Reorder Level"
              value={inventoryInsights.lowStockItems.length}
              subtitle="Procurement needed"
              icon={<AlertTriangle className="w-4 h-4" />}
              iconBg="bg-amber-100 text-[#C77700] dark:bg-amber-950/40 dark:text-amber-400"
              onClick={() => onNavigate('products')}
            />

            <StatCard
              label="Expiring Batches"
              value={inventoryInsights.expiringItems.length}
              subtitle="Approaching within 90 days"
              icon={<Clock className="w-4 h-4" />}
              iconBg="bg-rose-100 text-[#D64545] dark:bg-rose-950/40 dark:text-rose-400"
              onClick={() => onNavigate('products')}
            />

            <StatCard
              label="Slow-Moving Stock"
              value={inventoryInsights.slowMovingItems.length}
              subtitle="Zero sales in past 30 days"
              icon={<Layers className="w-4 h-4" />}
              iconBg="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Reorder Suggestions Card */}
            <Card
              title="Recommended Procurement (Reorder List)"
              subtitle="Derived from current stock below configured minimum threshold"
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('purchases')}
                >
                  Create Purchase Inward
                </Button>
              }
              noPadding
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Stock</th>
                    <th className="p-3 text-center">Min Level</th>
                    <th className="p-3 text-center">Suggested Order</th>
                    <th className="p-3">Recommendation Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {inventoryInsights.reorderSuggestions.length > 0 ? (
                    inventoryInsights.reorderSuggestions.map((item) => (
                      <tr key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-3 font-semibold">{item.name}</td>
                        <td className="p-3 text-center font-bold text-[#D64545]">{item.current_stock}</td>
                        <td className="p-3 text-center text-gray-500">{item.min_stock}</td>
                        <td className="p-3 text-center font-bold text-[#3F7D4A] bg-green-50/50 dark:bg-green-950/20">
                          +{item.suggested_qty}
                        </td>
                        <td className="p-3 text-[11px] text-gray-500">{item.reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        All products are currently stocked above their reorder thresholds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* FEFO Expiry Risk Card */}
            <Card
              title="Expiry Exposure (FEFO Action List)"
              subtitle="Stock batches approaching expiry within 90 days"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('billing')}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Prioritize on Counter
                </Button>
              }
              noPadding
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#151D26] border-b border-[#E1E5EA] dark:border-[#303B47] text-gray-500">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Batch #</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-center">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {inventoryInsights.expiringItems.length > 0 ? (
                    inventoryInsights.expiringItems.map((e) => (
                      <tr key={e.batch_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-3 font-semibold">{e.product_name}</td>
                        <td className="p-3 font-mono">{e.batch_number}</td>
                        <td className="p-3 font-medium text-gray-700 dark:text-gray-300">{e.expiry_date}</td>
                        <td className="p-3 text-center font-bold">{e.quantity}</td>
                        <td className="p-3 text-center font-bold">
                          {e.days_left <= 30 ? (
                            <Badge variant="danger" size="sm">{e.days_left} Days (Urgent)</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">{e.days_left} Days</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No batches expiring within the next 90 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
