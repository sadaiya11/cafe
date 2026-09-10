import { useEffect, useState } from 'react'
import { 
  getLocalCatalog, 
  loadCatalog, 
  updateCatalogProduct, 
  addNewCatalogProduct, 
  deleteCatalogProduct, 
  uploadCatalogProductImage 
} from '../../services/productCatalog'

const emptyDraft = { title: '', description: '', price: '', image: '' }
const emptyNewProduct = { title: '', category: 'Classic Bun Maska', price: '', description: '', image: '' }

export default function ProductsCatalogView({ onProductsChange }) {
  const [products, setProducts] = useState(getLocalCatalog)
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSlug, setEditingSlug] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [savingSlug, setSavingSlug] = useState(null)
  const [uploadingSlug, setUploadingSlug] = useState(null)
  const [notice, setNotice] = useState('')

  // Add New Product modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProduct, setNewProduct] = useState(emptyNewProduct)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadCatalog().then((catalog) => {
      setProducts(catalog)
      onProductsChange?.(catalog)
    })
  }, [onProductsChange])

  const categories = ['ALL', ...new Set(products.map((product) => product.category))]
  
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase()
    const title = product.title || product.name || ''
    const desc = product.description || ''
    return (selectedCategory === 'ALL' || product.category === selectedCategory)
      && (!query || title.toLowerCase().includes(query) || desc.toLowerCase().includes(query))
  })

  const beginEdit = (product) => {
    setEditingSlug(product.slug)
    setDraft({ 
      title: product.title || product.name, 
      description: product.description, 
      price: String(product.variants?.[0]?.price ?? product.price ?? 0), 
      image: product.variants?.[0]?.image || product.image || '' 
    })
    setNotice('')
  }

  const save = async (product, changes) => {
    const primaryPrice = Number(changes.price ?? product.variants?.[0]?.price ?? product.price)
    if (!Number.isFinite(primaryPrice) || primaryPrice < 0) {
      setNotice('Enter a valid price of zero or more.')
      return
    }
    const nextProduct = {
      ...product,
      ...changes,
      price: primaryPrice,
      variants: (product.variants || [{ id: 'std', name: 'Standard', price: primaryPrice }]).map((variant, index) => 
        index === 0 ? { ...variant, price: primaryPrice, image: changes.image || variant.image, gallery: [changes.image || variant.image, ...(variant.gallery || []).filter((image) => image !== variant.image)].filter(Boolean) } : variant
      ),
    }
    setSavingSlug(product.slug)
    try {
      const saved = await updateCatalogProduct(nextProduct)
      setProducts((current) => {
        const next = current.map((item) => item.slug === product.slug ? saved : item)
        onProductsChange?.(next)
        return next
      })
      setEditingSlug(null)
      setNotice('Saved successfully! Menu and POS now use these updated details.')
    } catch (error) {
      setNotice(`Notice: ${error.message}`)
    } finally {
      setSavingSlug(null)
    }
  }

  // Handle Add New Product Submit
  const handleCreateProduct = async (e) => {
    e.preventDefault()
    if (!newProduct.title.trim()) {
      setNotice('Please enter a product title.')
      return
    }
    const numPrice = parseFloat(newProduct.price)
    if (isNaN(numPrice) || numPrice < 0) {
      setNotice('Please enter a valid price.')
      return
    }

    setIsAdding(true)
    try {
      const addedItem = await addNewCatalogProduct(newProduct)
      const updatedList = await loadCatalog()
      setProducts(updatedList)
      onProductsChange?.(updatedList)
      setShowAddModal(false)
      setNewProduct(emptyNewProduct)
      setNotice(`✅ "${addedItem.title}" successfully added to menu and POS!`)
    } catch (err) {
      setNotice(`Failed to add product: ${err.message}`)
    } finally {
      setIsAdding(false)
    }
  }

  // Handle Delete Product
  const handleDeleteProduct = async (product) => {
    const title = product.title || product.name
    if (window.confirm(`Are you sure you want to delete "${title}" from the menu?`)) {
      await deleteCatalogProduct(product.slug)
      const updatedList = await loadCatalog()
      setProducts(updatedList)
      onProductsChange?.(updatedList)
      setNotice(`🗑️ "${title}" deleted from menu.`)
    }
  }

  const toggleStock = (product) => save(product, { inStock: product.inStock === false })

  const handleImageUpload = async (product, file) => {
    if (!file) return
    setUploadingSlug(product.slug)
    setNotice('')
    try {
      const { imageUrl } = await uploadCatalogProductImage(product.slug, file)
      setDraft((current) => ({ ...current, image: imageUrl }))
      setNotice('Image uploaded. Click Save to publish it.')
    } catch (error) {
      setNotice(`Image not uploaded: ${error.message}`)
    } finally {
      setUploadingSlug(null)
    }
  }

  const handleNewProductImageUpload = async (file) => {
    if (!file) return
    setNotice('Uploading image...')
    try {
      const tempSlug = (newProduct.title || 'new-item').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
      const { imageUrl } = await uploadCatalogProductImage(tempSlug, file)
      setNewProduct(prev => ({ ...prev, image: imageUrl }))
      setNotice('Image uploaded!')
    } catch (error) {
      setNotice(`Image upload notice: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header & Add Product Action */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Food Menu & Stock Catalog</h2>
          <p className="mt-0.5 text-xs text-slate-400">All {products.length} menu items. Add new products, update prices, edit details, or delete items.</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <span className="text-base font-black">+</span>
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button 
              key={category} 
              onClick={() => setSelectedCategory(category)} 
              className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === category 
                  ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold' 
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative max-w-md min-w-[220px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔍</span>
          <input 
            value={searchQuery} 
            onChange={(event) => setSearchQuery(event.target.value)} 
            placeholder="Search catalog items..." 
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none" 
          />
        </div>
      </div>

      {notice && (
        <div className={`p-3 rounded-xl border text-xs font-medium ${
          notice.includes('Failed') || notice.includes('deleted') 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {notice}
        </div>
      )}

      {/* Grid of Product Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => {
          const isInStock = product.inStock !== false
          const isEditing = editingSlug === product.slug
          const isSaving = savingSlug === product.slug
          const title = product.title || product.name
          const price = Number(product.variants?.[0]?.price ?? product.price ?? 0)
          const image = product.variants?.[0]?.image || product.image

          return (
            <div key={product.slug} className={`flex flex-col justify-between rounded-2xl border bg-slate-900/90 p-4 transition-all ${isInStock ? 'border-slate-800' : 'border-slate-800/50 opacity-65'}`}>
              <div>
                {/* Thumbnail Image & Stock Status */}
                <div className="relative mb-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  {image ? (
                    <img src={image} alt={title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">☕</span>
                  )}
                  <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${isInStock ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                    {isInStock ? 'AVAILABLE' : 'OUT OF STOCK'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{product.category}</p>
                  
                  {/* Delete Product Trigger */}
                  {!isEditing && (
                    <button
                      onClick={() => handleDeleteProduct(product)}
                      className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                      title="Delete Product"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <input 
                      value={draft.title} 
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })} 
                      aria-label="Product name" 
                      className="w-full rounded border border-amber-500 bg-slate-950 px-2 py-1 text-sm font-bold text-white focus:outline-none" 
                    />
                    <textarea 
                      value={draft.description} 
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })} 
                      aria-label="Product description" 
                      rows="2" 
                      className="w-full rounded border border-amber-500 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none" 
                    />
                    <label className="block cursor-pointer rounded border border-dashed border-slate-600 px-2 py-2 text-center text-xs text-slate-300 hover:border-amber-400">
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp,image/gif" 
                        className="hidden" 
                        disabled={uploadingSlug === product.slug} 
                        onChange={(event) => handleImageUpload(product, event.target.files?.[0])} 
                      />
                      {uploadingSlug === product.slug ? 'Uploading image…' : '📷 Change image'}
                    </label>
                    {draft.image && <img src={draft.image} alt="New product preview" className="h-16 w-full rounded object-cover" />}
                  </div>
                ) : (
                  <>
                    <h3 className="mt-0.5 text-sm font-bold text-white">{title}</h3>
                    <p className="mt-1 min-h-[32px] text-xs text-slate-400">{product.description}</p>
                  </>
                )}
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-3">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">₹</span>
                    <input 
                      type="number" 
                      min="0" 
                      step="1" 
                      value={draft.price} 
                      onChange={(event) => setDraft({ ...draft, price: event.target.value })} 
                      aria-label="Product price" 
                      className="w-20 rounded border border-amber-500 bg-slate-950 px-2 py-1 text-xs font-bold text-white focus:outline-none" 
                    />
                    <button 
                      disabled={isSaving} 
                      onClick={() => save(product, draft)} 
                      className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-slate-950 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingSlug(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black text-amber-400">₹{price.toFixed(2)}</span>
                    <button onClick={() => beginEdit(product)} className="text-xs font-bold text-slate-300 hover:text-amber-400 transition-colors">✏️ Edit Details</button>
                  </div>
                )}

                <button 
                  disabled={isSaving} 
                  onClick={() => toggleStock(product)} 
                  className={`mt-3 w-full rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition-all ${
                    isInStock 
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20' 
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  {isSaving ? 'Saving…' : isInStock ? 'Mark Out of Stock' : 'Mark Available'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ADD NEW PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Admin Catalog</span>
                <h3 className="text-lg font-bold text-white tracking-tight">Add New Food Product</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Bun Maska Cheese"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Classic Bun Maska">Classic Bun Maska</option>
                    <option value="Special Maska">Special Maska</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks & Combos">Snacks & Combos</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="e.g. 120"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Fresh warm bun loaded with creamy butter..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Image (Upload or Image URL)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="https://... or upload below"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all">
                    <span>📷 Upload</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleNewProductImageUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>
                {newProduct.image && (
                  <img src={newProduct.image} alt="Preview" className="h-20 w-full object-cover rounded-xl mt-2 border border-slate-800" />
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isAdding ? 'Adding Item...' : '✓ Add Product to Catalog'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}
