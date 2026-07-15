import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  X,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useBusinessDashboard } from '../hooks/useDashboardData';
import { productAPI, uploadAPI } from '../services/api';
import ImageUpload from '../components/ImageUpload';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Category and subcategory structure as per requirements
const categories = {
  'Food Stuffs': ['Snacks', 'Beverages', 'Fries'],
  'Households': ['New', 'Second Hand'],
  'Gas': [],
  'Wines & Spirits': [],
  'House Shopping': ['Rice', 'Unga', 'Cooking Oil', 'Salt', 'Sugar', 'Flour', 'Soap', 'Other Essentials'],
  'Health Care': ['Medicines', 'Medical Supplies', 'Pharmacy Products'],
};

const BusinessProductsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { stats, loading: dashboardLoading, refetch: refetchStats } = useBusinessDashboard();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Form state for adding/editing products
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    deliveryFee: '',
    category: '',
    subcategory: '',
    stock: '',
    images: [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState([]);

  // Stock update form
  const [stockFormData, setStockFormData] = useState({ stock: '', isActive: true });

  // Fetch products
  const fetchProducts = async (pageNumber = 1, append = false) => {
    try {
      setLoading(true);
      const params = {
        page: pageNumber,
        limit: 12,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      };

      const { data } = await productAPI.getMyProducts(params);

      if (append) {
        setProducts((prev) => [...prev, ...data.data]);
      } else {
        setProducts(data.data);
      }

      setTotalProducts(data.pagination?.total || 0);
      setHasMore(data.data.length === 12);
      setPage(pageNumber);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toastError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, false);
  }, [selectedCategory, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(1, false);
  };

  const handleLoadMore = () => {
    fetchProducts(page + 1, true);
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Valid price is required';
    if (!formData.category) errors.category = 'Category is required';
    if (formData.stock === '' || parseFloat(formData.stock) < 0) errors.stock = 'Valid stock quantity is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add new product
  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        deliveryFee: parseFloat(formData.deliveryFee) || 0,
        category: formData.category,
        subcategory: formData.subcategory,
        stock: parseInt(formData.stock) || 0,
        images: formData.images,
      };

      const { data } = await productAPI.create(productData);

      // Add to local list
      setProducts((prev) => [data.data, ...prev]);

      // Reset form and close modal
      resetForm();
      setShowAddModal(false);

      toastSuccess('Product created successfully!');
      refetchStats();
    } catch (error) {
      console.error('Failed to create product:', error);
      toastError(error.response?.data?.message || 'Failed to create product');
    }
  };

  // Edit product
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      deliveryFee: (product.deliveryFee || 0).toString(),
      category: product.category,
      subcategory: product.subcategory || '',
      stock: (product.stock || 0).toString(),
      images: product.images || [],
    });
    setImagePreviews(product.images || []);
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setUploading(true);

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        deliveryFee: parseFloat(formData.deliveryFee) || 0,
        category: formData.category,
        subcategory: formData.subcategory,
        stock: parseInt(formData.stock) || 0,
        images: formData.images,
      };

      const { data } = await productAPI.update(selectedProduct._id, productData);

      // Update local list
      setProducts((prev) => prev.map(p => p._id === selectedProduct._id ? data.data : p));

      // Reset form and close modal
      resetForm();
      setShowEditModal(false);

      toastSuccess('Product updated successfully!');
      refetchStats();
    } catch (error) {
      console.error('Failed to update product:', error);
      toastError(error.response?.data?.message || 'Failed to update product');
    } finally {
      setUploading(false);
    }
  };

  // Delete product
  const handleDeleteClick = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await productAPI.delete(selectedProduct._id);

      // Remove from local list
      setProducts((prev) => prev.filter(p => p._id !== selectedProduct._id));

      setShowDeleteModal(false);
      setSelectedProduct(null);

      toastSuccess('Product deleted successfully!');
      refetchStats();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toastError(error.response?.data?.message || 'Failed to delete product');
    }
  };

  // Stock update
  const handleStockClick = (product) => {
    setSelectedProduct(product);
    setStockFormData({
      stock: product.stock.toString(),
      isActive: product.isActive !== false,
    });
    setShowStockModal(true);
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();

    try {
      const { data } = await productAPI.update(selectedProduct._id, {
        stock: parseInt(stockFormData.stock),
        isActive: stockFormData.isActive,
      });

      // Update local list
      setProducts((prev) => prev.map(p => p._id === selectedProduct._id ? data.data : p));

      setShowStockModal(false);
      setSelectedProduct(null);

      toastSuccess('Stock updated successfully!');
      refetchStats();
    } catch (error) {
      console.error('Failed to update stock:', error);
      toastError(error.response?.data?.message || 'Failed to update stock');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      deliveryFee: '',
      category: '',
      subcategory: '',
      stock: '',
      images: [],
    });
    setFormErrors({});
    setImagePreviews([]);
    setSelectedProduct(null);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowStockModal(false);
    resetForm();
  };

  if (dashboardLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">Products</h1>
          <p className="text-secondary-500 mt-1">Manage your product inventory</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Product
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Total Products</p>
              <p className="text-2xl font-bold text-secondary-800">{stats?.totalProducts || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Active Products</p>
              <p className="text-2xl font-bold text-secondary-800">{stats?.activeProducts || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Out of Stock</p>
              <p className="text-2xl font-bold text-secondary-800">{stats?.outOfStockProducts || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {Object.keys(categories).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {selectedCategory && categories[selectedCategory].length > 0 && (
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Subcategories</option>
              {categories[selectedCategory].map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          )}
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {/* Products Grid */}
      {products.length === 0 && !loading ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-secondary-300" />
          <h3 className="text-xl font-bold text-secondary-800 mb-2">No Products Found</h3>
          <p className="text-secondary-500 mb-6">Start by adding your first product</p>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product._id} className="card overflow-hidden">
              <div className="aspect-video bg-secondary-100 relative">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-12 h-12 text-secondary-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${product.isActive !== false && product.stock > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}>
                    {product.isActive === false ? 'Inactive' : product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-secondary-800 flex-1">{product.name}</h3>
                  <p className="text-lg font-bold text-primary-600 ml-2">
                    {formatCurrency(product.price)}
                  </p>
                </div>

                <p className="text-sm text-secondary-500 mb-3 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-secondary-500 mb-4 flex-wrap">
                  <span className="px-2 py-1 bg-secondary-100 rounded text-xs">{product.category}</span>
                  {product.subcategory && (
                    <span className="px-2 py-1 bg-secondary-100 rounded text-xs">{product.subcategory}</span>
                  )}
                  <span className="text-xs">Stock: {product.stock || 0}</span>
                  {product.deliveryFee > 0 && (
                    <span className="text-xs">Delivery: {formatCurrency(product.deliveryFee)}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Edit2 size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStockClick(product)}
                  >
                    <Package size={14} />
                    Stock
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteClick(product)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && products.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            isLoading={loading}
          >
            Load More Products
          </Button>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={closeModal}
        title="Add Product"
        size="lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Product Name *</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                fullWidth
              />
              {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter product description"
                rows={3}
                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800"
              />
              {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Price (KSh) *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                fullWidth
              />
              {formErrors.price && <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Delivery Fee (KSh)</label>
              <Input
                type="number"
                value={formData.deliveryFee}
                onChange={(e) => setFormData((prev) => ({ ...prev, deliveryFee: e.target.value }))}
                placeholder="0.00"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value, subcategory: '' }))}
                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800"
              >
                <option value="">Select category</option>
                {Object.keys(categories).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Subcategory</label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800"
                disabled={!formData.category || !categories[formData.category]?.length}
              >
                <option value="">Select subcategory</option>
                {formData.category && categories[formData.category]?.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Stock Quantity *</label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                placeholder="0"
                fullWidth
              />
              {formErrors.stock && <p className="text-red-500 text-sm mt-1">{formErrors.stock}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Product Image</label>
              <p className="text-sm text-secondary-500 mb-2">Click the box below to select a single product image.</p>
              <ImageUpload
                multiple={false}
                maxFiles={1}
                initialImages={formData.images}
                onUpload={(img) => setFormData((prev) => ({ ...prev, images: [typeof img === 'string' ? img : img?.url || ''] }))}
                onUploadStateChange={setUploading}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={uploading}>Add Product</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={closeModal}
        title="Edit Product"
        size="lg"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Product Name *</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                fullWidth
              />
              {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter product description"
                rows={3}
                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800"
              />
              {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Price (KSh) *</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                fullWidth
              />
              {formErrors.price && <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Delivery Fee (KSh)</label>
              <Input
                type="number"
                value={formData.deliveryFee}
                onChange={(e) => setFormData((prev) => ({ ...prev, deliveryFee: e.target.value }))}
                placeholder="0.00"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value, subcategory: '' }))}
                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800"
              >
                <option value="">Select category</option>
                {Object.keys(categories).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Subcategory</label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
                className="w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-lg text-secondary-800"
                disabled={!formData.category || !categories[formData.category]?.length}
              >
                <option value="">Select subcategory</option>
                {formData.category && categories[formData.category]?.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Stock Quantity *</label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                placeholder="0"
                fullWidth
              />
              {formErrors.stock && <p className="text-red-500 text-sm mt-1">{formErrors.stock}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Product Image</label>
              <p className="text-sm text-secondary-500 mb-2">Click the box below to select a single product image.</p>
              <ImageUpload
                multiple={false}
                maxFiles={1}
                initialImages={formData.images}
                onUpload={(img) => setFormData((prev) => ({ ...prev, images: [typeof img === 'string' ? img : img?.url || ''] }))}
                onUploadStateChange={setUploading}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={uploading}>Update Product</Button>
          </div>
        </form>
      </Modal>

      {/* Stock Update Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Update Stock"
        size="sm"
      >
        <form onSubmit={handleUpdateStock} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Stock Quantity</label>
            <Input
              type="number"
              value={stockFormData.stock}
              onChange={(e) => setStockFormData((prev) => ({ ...prev, stock: e.target.value }))}
              placeholder="0"
              fullWidth
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={stockFormData.isActive}
              onChange={(e) => setStockFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-secondary-700">Product is active/available</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
            <Button type="button" variant="outline" onClick={() => setShowStockModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Update Stock</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={closeModal}
        title="Delete Product"
        size="sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-secondary-800 mb-2">
            Are you sure you want to delete this product?
          </h3>
          <p className="text-secondary-500 mb-6">
            This action cannot be undone. The product "{selectedProduct?.name}" will be permanently deleted.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BusinessProductsPage;