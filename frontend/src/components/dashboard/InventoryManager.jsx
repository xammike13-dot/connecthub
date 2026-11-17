// frontend/src/components/dashboard/InventoryManager.jsx
// Vendor Inventory Management CRUD with dynamic Variations & Add-ons Builder

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Package, 
  Tag, 
  Sparkles, 
  X, 
  Check, 
  AlertCircle,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import api from '../../utils/api';
import OLA_CATEGORIES from '../../config/categories';
import { useToast } from '../Toast';

export default function InventoryManager({ user }) {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast() || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Food & Drinks',
    subcategory: '',
    price: '',
    stockCount: 10,
    description: '',
    imageUrl: '',
    condition: 'New',
    variations: [], // [{ name: 'Size', options: ['40', '41'] }]
    addOns: [],     // [{ name: 'Extra Cheese', price: 30 }]
  });

  // Dynamic Variation Builder Temp Inputs
  const [varName, setVarName] = useState('');
  const [varOptions, setVarOptions] = useState('');

  // Dynamic AddOn Builder Temp Inputs
  const [addOnName, setAddOnName] = useState('');
  const [addOnPrice, setAddOnPrice] = useState('');

  // 1. Fetch Vendor's Products via TanStack Query
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['vendor-products', user?._id],
    queryFn: async () => {
      // Primary: /business/my-products, Fallback: /products?business=:id
      try {
        const res = await api.get('/business/my-products');
        return res.data?.data || res.data?.products || [];
      } catch {
        const res = await api.get('/products', {
          params: { business: user?._id, limit: 100 },
        });
        return res.data?.data || res.data?.products || [];
      }
    },
    enabled: Boolean(user?._id),
  });

  // 2. Mutation: Create Product
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/products', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      resetForm();
      showToast?.('Product added to inventory!', 'success');
    },
    onError: (err) => {
      showToast?.(err.response?.data?.message || 'Failed to create product', 'error');
    },
  });

  // 3. Mutation: Delete Product
  const deleteMutation = useMutation({
    mutationFn: async (productId) => {
      const res = await api.delete(`/products/${productId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast?.('Product removed from catalog', 'success');
    },
  });

  // Handlers for dynamic variations
  const handleAddVariation = () => {
    if (!varName.trim() || !varOptions.trim()) return;
    const optionsArray = varOptions
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    setFormData((prev) => ({
      ...prev,
      variations: [...prev.variations, { name: varName.trim(), options: optionsArray }],
    }));
    setVarName('');
    setVarOptions('');
  };

  const handleRemoveVariation = (idx) => {
    setFormData((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== idx),
    }));
  };

  // Handlers for dynamic add-ons
  const handleAddAddOn = () => {
    if (!addOnName.trim() || !addOnPrice) return;
    setFormData((prev) => ({
      ...prev,
      addOns: [...prev.addOns, { name: addOnName.trim(), price: Number(addOnPrice) }],
    }));
    setAddOnName('');
    setAddOnPrice('');
  };

  const handleRemoveAddOn = (idx) => {
    setFormData((prev) => ({
      ...prev,
      addOns: prev.addOns.filter((_, i) => i !== idx),
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Food & Drinks',
      subcategory: '',
      price: '',
      stockCount: 10,
      description: '',
      imageUrl: '',
      condition: 'New',
      variations: [],
      addOns: [],
    });
    setVarName('');
    setVarOptions('');
    setAddOnName('');
    setAddOnPrice('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category) {
      showToast?.('Please fill in required fields', 'warning');
      return;
    }

    const payload = {
      name: formData.name,
      category: formData.category,
      subcategory: formData.subcategory,
      price: Number(formData.price),
      stock: Number(formData.stockCount),
      stockCount: Number(formData.stockCount),
      description: formData.description,
      condition: formData.condition,
      images: formData.imageUrl ? [formData.imageUrl] : [],
      variations: formData.variations,
      addOns: formData.addOns,
    };

    createMutation.mutate(payload);
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Package size={20} className="text-[#FF5E00]" />
            <span>Store Inventory Catalog</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your campus product listings, dynamic sizes/colors, and food extras.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] focus:outline-none"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
            Loading store inventory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF5E00] flex items-center justify-center mx-auto mb-3">
              <Package size={24} />
            </div>
            <h3 className="text-sm font-bold text-gray-800">No products in inventory</h3>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Add your first campus product, meal, or service to start receiving customer orders.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#FF5E00] text-white text-xs font-bold rounded-xl"
            >
              Upload New Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 font-bold">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Variations / Extras</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">{product.emoji || '📦'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate max-w-[180px]">{product.name}</p>
                          <span className="text-[10px] text-gray-400 truncate block">ID: {product._id?.slice(-6)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-black text-gray-900 text-sm">
                        KSh {product.price?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        (product.stockCount ?? product.stock) > 0
                          ? 'bg-olaGreen-light text-olaGreen-DEFAULT'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {(product.stockCount ?? product.stock) > 0
                          ? `${product.stockCount ?? product.stock} in stock`
                          : 'Out of stock'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        {product.variations?.length > 0 && (
                          <span className="text-olaOrange-DEFAULT font-semibold">
                            {product.variations.map((v) => `${v.name} (${v.options.length})`).join(', ')}
                          </span>
                        )}
                        {product.addOns?.length > 0 && (
                          <span className="text-olaGreen-DEFAULT font-medium">
                            +{product.addOns.length} extras
                          </span>
                        )}
                        {!product.variations?.length && !product.addOns?.length && (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${product.name}?`)) {
                            deleteMutation.mutate(product._id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE PRODUCT MODAL ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Add New Product</h3>
                <p className="text-xs text-gray-400">Configure catalog item, variations, and add-on pricing.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Fields */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vintage Denim Jacket or Special Pilau"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] font-medium cursor-pointer"
                  >
                    {OLA_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.label}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Subcategory</label>
                  <input
                    type="text"
                    placeholder="e.g. Denim, Sneakers, Fast Bites"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Base Price (KSh) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="150"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Available Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="10"
                    value={formData.stockCount}
                    onChange={(e) => setFormData({ ...formData, stockCount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Description</label>
                <textarea
                  rows="2"
                  placeholder="Details, sizing recommendations, or preparation method..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF5E00] font-medium"
                />
              </div>

              {/* ── Dynamic Variations Section ── */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-olaOrange-DEFAULT flex items-center gap-1">
                    <Sparkles size={13} />
                    <span>Product Variations (Sizes / Colors)</span>
                  </label>
                </div>

                {/* Active Variations List */}
                {formData.variations.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-olaOrange-light/60 p-2.5 rounded-xl border border-olaOrange-DEFAULT/20 text-xs">
                    <div>
                      <span className="font-bold text-neutral-900 font-bold">{v.name}: </span>
                      <span className="text-olaOrange-DEFAULT">{v.options.join(', ')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariation(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* Add Variation Row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Variation (e.g. Size)"
                    value={varName}
                    onChange={(e) => setVarName(e.target.value)}
                    className="w-1/3 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Options (e.g. 40, 41, 42)"
                    value={varOptions}
                    onChange={(e) => setVarOptions(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className="px-3 py-1.5 bg-olaOrange-DEFAULT text-white font-bold text-xs rounded-lg hover:bg-olaOrange-hover"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* ── Dynamic Add-ons Section ── */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <label className="text-xs font-bold text-olaGreen-DEFAULT flex items-center gap-1">
                  <Plus size={13} />
                  <span>Food Add-Ons / Extras</span>
                </label>

                {/* Active Add-ons List */}
                {formData.addOns.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-olaGreen-light/60 p-2.5 rounded-xl border border-olaGreen-DEFAULT/20 text-xs">
                    <div>
                      <span className="font-bold text-neutral-900 font-bold">{a.name}</span>
                      <span className="text-olaGreen-DEFAULT ml-2 font-bold">(+KSh {a.price})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddOn(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* Add Add-On Row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Extra (e.g. Extra Smokie)"
                    value={addOnName}
                    onChange={(e) => setAddOnName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="+Price (e.g. 30)"
                    value={addOnPrice}
                    onChange={(e) => setAddOnPrice(e.target.value)}
                    className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddAddOn}
                    className="px-3 py-1.5 bg-olaGreen-DEFAULT text-white font-bold text-xs rounded-lg hover:bg-olaGreen-deep"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-6 py-2.5 bg-[#FF5E00] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Publishing...' : 'Save & Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
