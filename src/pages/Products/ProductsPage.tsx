import React, { useState, useEffect } from 'react';
import { Product, Batch } from '../../types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import {
  Search,
  Plus,
  Package,
  Layers,
  Edit2,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { user } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingBatchesProduct, setViewingBatchesProduct] = useState<Product | null>(null);
  const [adjustingStockProduct, setAdjustingStockProduct] = useState<Product | null>(null);

  // Stock adjustment fields
  const [adjustQtyChange, setAdjustQtyChange] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'adjustment' | 'damage' | 'expiry' | 'return'>('adjustment');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustBatchId, setAdjustBatchId] = useState<number | undefined>(undefined);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Form fields for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Fertilizers',
    subcategory: '',
    brand: '',
    manufacturer: '',
    unit: 'Bag',
    hsn_sac: '',
    purchase_rate: '',
    selling_rate: '',
    mrp: '',
    tax_rate: '5',
    opening_stock: '0',
    min_stock: '10',
    active_ingredient: '',
    pack_size: '',
    notes: '',
    batch_number: '',
    mfg_date: '',
    expiry_date: '',
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const prods = await window.electronAPI.getProducts({
          category: selectedCategory,
          stockStatus: stockStatusFilter,
          searchQuery,
        });
        setProducts(prods);

        const cats = await window.electronAPI.getCategories();
        setCategories(['All', ...cats]);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, stockStatusFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `PROD-${Date.now().toString().slice(-5)}`,
      barcode: '',
      category: 'Fertilizers',
      subcategory: '',
      brand: '',
      manufacturer: '',
      unit: 'Bag',
      hsn_sac: '3102',
      purchase_rate: '',
      selling_rate: '',
      mrp: '',
      tax_rate: '5',
      opening_stock: '0',
      min_stock: '10',
      active_ingredient: '',
      pack_size: '',
      notes: '',
      batch_number: '',
      mfg_date: '',
      expiry_date: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category: p.category,
      subcategory: p.subcategory || '',
      brand: p.brand || '',
      manufacturer: p.manufacturer || '',
      unit: p.unit,
      hsn_sac: p.hsn_sac || '',
      purchase_rate: String(p.purchase_rate),
      selling_rate: String(p.selling_rate),
      mrp: String(p.mrp),
      tax_rate: String(p.tax_rate),
      opening_stock: String(p.current_stock),
      min_stock: String(p.min_stock),
      active_ingredient: p.active_ingredient || '',
      pack_size: p.pack_size || '',
      notes: p.notes || '',
      batch_number: '',
      mfg_date: '',
      expiry_date: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      toast.warning('Product name and SKU are required');
      return;
    }

    try {
      if (window.electronAPI) {
        if (editingProduct) {
          const res = await window.electronAPI.updateProduct({
            id: editingProduct.id,
            data: {
              name: formData.name,
              barcode: formData.barcode,
              category: formData.category,
              subcategory: formData.subcategory,
              brand: formData.brand,
              manufacturer: formData.manufacturer,
              unit: formData.unit,
              hsn_sac: formData.hsn_sac,
              purchase_rate: Number(formData.purchase_rate) || 0,
              selling_rate: Number(formData.selling_rate) || 0,
              mrp: Number(formData.mrp) || 0,
              tax_rate: Number(formData.tax_rate) || 0,
              min_stock: Number(formData.min_stock) || 10,
              active_ingredient: formData.active_ingredient,
              pack_size: formData.pack_size,
              notes: formData.notes,
            },
            userId: user?.id,
          });

          if (res.success) {
            toast.success(`Product '${formData.name}' updated`);
            setIsAddModalOpen(false);
            fetchProducts();
          } else {
            toast.error(res.error || 'Failed to update product');
          }
        } else {
          const res = await window.electronAPI.createProduct({
            name: formData.name,
            sku: formData.sku,
            barcode: formData.barcode,
            category: formData.category,
            subcategory: formData.subcategory,
            brand: formData.brand,
            manufacturer: formData.manufacturer,
            unit: formData.unit,
            hsn_sac: formData.hsn_sac,
            purchase_rate: Number(formData.purchase_rate) || 0,
            selling_rate: Number(formData.selling_rate) || 0,
            mrp: Number(formData.mrp) || 0,
            tax_rate: Number(formData.tax_rate) || 0,
            opening_stock: Number(formData.opening_stock) || 0,
            min_stock: Number(formData.min_stock) || 10,
            active_ingredient: formData.active_ingredient,
            pack_size: formData.pack_size,
            notes: formData.notes,
            batch_number: formData.batch_number,
            mfg_date: formData.mfg_date,
            expiry_date: formData.expiry_date,
            userId: user?.id,
          });

          if (res.success) {
            toast.success(`Product '${formData.name}' created`);
            setIsAddModalOpen(false);
            fetchProducts();
          } else {
            toast.error(res.error || 'Failed to create product');
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving product');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingStockProduct || !adjustQtyChange || !adjustReason) {
      toast.warning('Quantity change and reason are required');
      return;
    }

    setIsAdjusting(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.adjustStock({
          productId: adjustingStockProduct.id,
          batchId: adjustBatchId,
          quantityChange: Number(adjustQtyChange),
          movementType: adjustType,
          reason: adjustReason,
          userId: user?.id,
        });

        if (res.success) {
          toast.success(`Stock adjusted for '${adjustingStockProduct.name}'`);
          setAdjustingStockProduct(null);
          setAdjustQtyChange('');
          setAdjustReason('');
          fetchProducts();
        } else {
          toast.error(res.error || 'Failed to adjust stock');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error adjusting stock');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Search Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            placeholder="Search Product, Formulation, Brand, SKU, Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
          />
        </div>

        {/* Stock Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F6F9] dark:bg-[#202A35] p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              stockStatusFilter === 'all'
                ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                : 'text-gray-700 dark:text-slate-300 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            All Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('low_stock')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              stockStatusFilter === 'low_stock'
                ? 'bg-white dark:bg-[#18212B] text-[#B45309] dark:text-[#FBBF24] shadow-xs'
                : 'text-gray-700 dark:text-slate-300 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              stockStatusFilter === 'out_of_stock'
                ? 'bg-white dark:bg-[#18212B] text-[#DC2626] dark:text-[#F87171] shadow-xs'
                : 'text-gray-700 dark:text-slate-300 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            Out of Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('expiring')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              stockStatusFilter === 'expiring'
                ? 'bg-white dark:bg-[#18212B] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-gray-700 dark:text-slate-300 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            Expiring (&lt;60d)
          </button>
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Product
        </Button>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {['All', 'Fertilizers', 'Pesticides', 'Seeds', 'Crop Nutrition', 'Hardware/Tools', 'Other'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#123F7A] text-white border-[#123F7A] dark:bg-[#6EA8FE] dark:text-slate-900'
                : 'bg-white dark:bg-[#18212B] text-gray-700 dark:text-slate-200 border-[#D1D5DB] dark:border-[#374151] hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] border border-[#D1D5DB] dark:border-[#374151] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] dark:bg-[#151D26] text-gray-700 dark:text-slate-200 border-b border-[#D1D5DB] dark:border-[#374151] font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-bold min-w-[200px]">Product / Formulation</th>
                <th className="py-2.5 px-4 font-bold">Category</th>
                <th className="py-2.5 px-4 font-bold">Brand / Unit</th>
                <th className="py-2.5 px-4 font-bold text-right">Purchase (₹)</th>
                <th className="py-2.5 px-4 font-bold text-right">Selling (₹)</th>
                <th className="py-2.5 px-4 font-bold text-center">GST%</th>
                <th className="py-2.5 px-4 font-bold text-center">Current Stock</th>
                <th className="py-2.5 px-4 font-bold text-center">Status</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1D5DB] dark:divide-[#374151]">
              {products.length > 0 ? (
                products.map((p) => {
                  const isOutOfStock = p.current_stock <= 0;
                  const isLowStock = p.current_stock > 0 && p.current_stock <= p.min_stock;

                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2836] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111827] dark:text-[#F9FAFB] text-sm">{p.name}</div>
                        <div className="text-[11px] text-gray-700 dark:text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 px-1 py-0.2 rounded text-[10px] font-bold">
                            {p.sku}
                          </span>
                          {p.active_ingredient && <span>• {p.active_ingredient}</span>}
                          {p.pack_size && <span>• {p.pack_size}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-slate-300 font-medium">
                        <div className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{p.brand || '-'}</div>
                        <div className="text-[11px] text-gray-600 dark:text-slate-400">{p.unit}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 dark:text-slate-300 font-medium">
                        ₹{p.purchase_rate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#123F7A] dark:text-[#6EA8FE]">
                        ₹{p.selling_rate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800 dark:text-slate-200">
                        {p.tax_rate}%
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-sm">
                        <span className={isOutOfStock ? 'text-[#DC2626] dark:text-[#F87171]' : isLowStock ? 'text-[#B45309] dark:text-[#FBBF24]' : 'text-[#166534] dark:text-[#86EFAC]'}>
                          {p.current_stock} <span className="text-xs font-normal text-gray-600 dark:text-slate-400 font-medium">{p.unit}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <Badge variant="danger" size="sm">Out of Stock</Badge>
                        ) : isLowStock ? (
                          <Badge variant="warning" size="sm">Low Stock</Badge>
                        ) : (
                          <Badge variant="success" size="sm">In Stock</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingBatchesProduct(p)}
                            title="View FEFO Batches & Expiry"
                            icon={<Layers className="w-3.5 h-3.5 text-blue-600" />}
                          >
                            Batches ({p.batches?.length || 0})
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdjustingStockProduct(p);
                              setAdjustQtyChange('');
                              setAdjustReason('');
                              setAdjustBatchId(p.batches && p.batches.length > 0 ? p.batches[0].id : undefined);
                            }}
                            title="Adjust Stock"
                            icon={<SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No products matched your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          title={editingProduct ? `Edit ${editingProduct.name}` : 'Add Agricultural Product'}
          subtitle="Define product specifications, packaging, taxes, and initial batch"
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Input
                  label="Product Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Neem Coated Urea (45kg)"
                  required
                />
              </div>
              <div>
                <Input
                  label="SKU Code *"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. FERT-UREA-45"
                  required
                  disabled={!!editingProduct}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 border border-[#E1E5EA] dark:border-[#303B47] rounded-lg bg-white dark:bg-[#18212B]"
                >
                  <option value="Fertilizers">Fertilizers</option>
                  <option value="Pesticides">Pesticides</option>
                  <option value="Seeds">Seeds</option>
                  <option value="Crop Nutrition">Crop Nutrition</option>
                  <option value="Hardware/Tools">Hardware/Tools</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Input
                  label="Brand / Company"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. IFFCO, Bayer"
                />
              </div>
              <div>
                <Input
                  label="Pack Size"
                  value={formData.pack_size}
                  onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                  placeholder="e.g. 50kg, 1L, 500g"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Unit *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full h-10 px-3 border border-[#E1E5EA] dark:border-[#303B47] rounded-lg bg-white dark:bg-[#18212B]"
                >
                  <option value="Bag">Bag</option>
                  <option value="Kg">Kg</option>
                  <option value="Litre">Litre</option>
                  <option value="Packet">Packet</option>
                  <option value="Piece">Piece</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Box">Box</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Active Ingredient / Formulation (Pesticide/Fertilizer Spec)"
                value={formData.active_ingredient}
                onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                placeholder="e.g. Chlorpyrifos 20% EC, Nitrogen 46%"
              />
              <Input
                label="HSN / SAC Code"
                value={formData.hsn_sac}
                onChange={(e) => setFormData({ ...formData, hsn_sac: e.target.value })}
                placeholder="e.g. 31021000, 38089199"
              />
            </div>

            {/* Pricing and Tax Slab */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label="Purchase Rate (₹)"
                type="number"
                step="any"
                value={formData.purchase_rate}
                onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="Selling Rate (₹) *"
                type="number"
                step="any"
                value={formData.selling_rate}
                onChange={(e) => setFormData({ ...formData, selling_rate: e.target.value })}
                placeholder="0.00"
                required
              />
              <Input
                label="MRP (₹)"
                type="number"
                step="any"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder="0.00"
              />
              <div>
                <label className="block text-xs font-semibold mb-1.5">GST Tax Rate *</label>
                <select
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  className="w-full h-10 px-3 border border-[#E1E5EA] dark:border-[#303B47] rounded-lg bg-white dark:bg-[#18212B]"
                >
                  <option value="0">0% (Seeds/Bio)</option>
                  <option value="5">5% (Fertilizers)</option>
                  <option value="12">12% (Micronutrients)</option>
                  <option value="18">18% (Agrochemicals)</option>
                  <option value="28">28% (Specialty)</option>
                </select>
              </div>
            </div>

            {/* Stock Thresholds and Initial Batch (only for new products) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                label="Opening Stock"
                type="number"
                value={formData.opening_stock}
                onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                disabled={!!editingProduct}
              />
              <Input
                label="Min Stock (Reorder Level)"
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
              />
              {!editingProduct && (
                <>
                  <Input
                    label="Batch Number"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="e.g. BAY-2026A"
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch Breakdown Modal (FEFO view) */}
      {viewingBatchesProduct && (
        <Modal
          isOpen={true}
          onClose={() => setViewingBatchesProduct(null)}
          title={`Batches for ${viewingBatchesProduct.name}`}
          subtitle={`Current Total Stock: ${viewingBatchesProduct.current_stock} ${viewingBatchesProduct.unit}`}
          maxWidth="xl"
        >
          <div className="space-y-3">
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 font-semibold">
                  <tr>
                    <th className="p-2.5">Batch Number</th>
                    <th className="p-2.5">Mfg Date</th>
                    <th className="p-2.5">Expiry Date</th>
                    <th className="p-2.5 text-center">Quantity</th>
                    <th className="p-2.5 text-right">Selling Rate</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {viewingBatchesProduct.batches && viewingBatchesProduct.batches.length > 0 ? (
                    viewingBatchesProduct.batches.map((b) => (
                      <tr key={b.id}>
                        <td className="p-2.5 font-mono font-bold">{b.batch_number}</td>
                        <td className="p-2.5 text-gray-500">{b.mfg_date || '-'}</td>
                        <td className="p-2.5 text-gray-700 dark:text-gray-300 font-medium">
                          {b.expiry_date || 'No Expiry'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-sm">
                          {b.quantity} {viewingBatchesProduct.unit}
                        </td>
                        <td className="p-2.5 text-right font-semibold">₹{b.selling_rate}</td>
                        <td className="p-2.5 text-center">
                          {b.quantity > 0 ? (
                            <Badge variant="success" size="sm">Active</Badge>
                          ) : (
                            <Badge variant="default" size="sm">Exhausted</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        No active batch records for this product.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingStockProduct && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustingStockProduct(null)}
          title={`Adjust Stock — ${adjustingStockProduct.name}`}
          subtitle={`Current stock: ${adjustingStockProduct.current_stock} ${adjustingStockProduct.unit}`}
          maxWidth="md"
        >
          <form onSubmit={handleStockAdjustment} className="space-y-3.5 text-xs">
            {/* Clarity guidance between Adjustment and Inward Purchase */}
            <div className="bg-[#FFF7ED] dark:bg-[#32230B] border border-[#B45309]/30 rounded-lg p-2.5 text-xs text-[#9A3412] dark:text-[#FDE68A] flex items-start gap-2 font-medium">
              <span className="font-bold shrink-0">⚠️ Notice:</span>
              <span>Stock Adjustment is for physical stock reconciliations, transit damage, or expired stock disposal. To record vendor stock arrivals, please use the <strong>Inward Purchases</strong> tab.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Adjustment Type *</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
              >
                <option value="adjustment">Physical Stock Audit / Correction</option>
                <option value="damage">Damaged Goods / Spillage</option>
                <option value="expiry">Expired Stock Disposal</option>
                <option value="return">Supplier Return</option>
              </select>
            </div>

            {adjustingStockProduct.batches && adjustingStockProduct.batches.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1">Select Batch</label>
                <select
                  value={adjustBatchId || ''}
                  onChange={(e) => setAdjustBatchId(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                >
                  {adjustingStockProduct.batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} (Avail: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">
                Quantity Change (+ to add, - to subtract) *
              </label>
              <input
                type="number"
                step="any"
                value={adjustQtyChange}
                onChange={(e) => setAdjustQtyChange(e.target.value)}
                placeholder="e.g. -5 or +10"
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B] font-bold text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Reason for Adjustment *</label>
              <textarea
                rows={2}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Annual physical inventory verification"
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#18212B]"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjustingStockProduct(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isAdjusting}>
                Apply Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
