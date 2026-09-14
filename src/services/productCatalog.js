import fallbackProducts from '../data/products.json'
import { getProducts, saveProduct, createProduct, deleteProduct, uploadProductImage } from './api'

const STORAGE_KEY = 'bun_maska_product_catalog_v5'

let memoryCatalog = []

const normalizeProduct = (p) => ({
  ...p,
  title: p.title || p.name,
  name: p.title || p.name,
  description: p.description !== undefined && p.description !== null ? String(p.description) : '',
  category: p.category || 'Bun Maska',
  tag: p.tag || '',
  price: Number(p.price ?? p.variants?.[0]?.price ?? 0),
  image: p.image || p.variants?.[0]?.image || '',
  inStock: p.inStock !== false,
  variants: Array.isArray(p.variants) && p.variants.length
    ? p.variants
    : [{ size: 'standard', label: 'Standard', price: Number(p.price || 0), image: p.image || '' }],
})

export function mergeCatalogProducts(savedProducts = []) {
  if (Array.isArray(savedProducts) && savedProducts.length > 0) {
    return savedProducts.map(normalizeProduct)
  }
  return fallbackProducts.map(normalizeProduct)
}

function storeProducts(products) {
  try {
    memoryCatalog = products
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  } catch (e) {
    console.warn('LocalStorage save notice:', e)
  }
}

export function getLocalCatalog() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeProduct)
    }
  } catch (error) {
    console.warn('LocalStorage read notice:', error.message)
  }
  return memoryCatalog.length ? memoryCatalog : fallbackProducts.map(normalizeProduct)
}

export async function loadCatalog() {
  try {
    const remoteProducts = await getProducts()
    if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
      const normalized = remoteProducts.map(normalizeProduct)
      storeProducts(normalized)
      return normalized
    }
  } catch (error) {
    console.warn('Product API unavailable; using local catalog:', error.message)
  }

  return getLocalCatalog()
}

export async function updateCatalogProduct(product) {
  const targetPrice = Number(product.price ?? product.variants?.[0]?.price ?? 0)
  const variants = Array.isArray(product.variants) && product.variants.length
    ? product.variants.map((v, i) => (i === 0 ? { ...v, price: targetPrice, image: product.image || v.image } : v))
    : [{ size: 'standard', label: 'Standard', price: targetPrice, image: product.image || '' }]

  const normalized = normalizeProduct({
    ...product,
    price: targetPrice,
    image: variants[0]?.image || product.image || '',
    variants,
    updatedAt: Date.now(),
  })

  // Update local memory cache immediately
  const current = getLocalCatalog().filter((item) => item.slug !== normalized.slug)
  const nextLocal = [...current, normalized]
  storeProducts(nextLocal)

  const saved = await saveProduct(normalized)
  if (saved?.slug || saved?.title) {
    const savedItem = normalizeProduct({ ...normalized, ...(saved || {}) })
    await loadCatalog()
    window.dispatchEvent(new Event('bun_catalog_updated'))
    return savedItem
  }
  throw new Error('Product save returned no product data.')
}

export async function addNewCatalogProduct(productData) {
  const slug = (productData.title || 'item').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4)
  const price = Number(productData.price || 0)

  const newProduct = normalizeProduct({
    id: slug,
    slug,
    title: productData.title,
    name: productData.title,
    description: productData.description || '',
    category: productData.category || 'Special Maska',
    inStock: true,
    price: price,
    image: productData.image || '',
    variants: [
      {
        id: `${slug}-std`,
        name: 'Standard',
        label: 'Standard',
        price: price,
        image: productData.image || '',
        gallery: productData.image ? [productData.image] : []
      }
    ]
  })

  // Update local memory cache immediately
  const current = getLocalCatalog().filter((item) => item.slug !== slug)
  storeProducts([...current, newProduct])

  const created = await createProduct(newProduct)
  const resultItem = created && (created.slug || created.title) ? normalizeProduct({ ...newProduct, ...created }) : newProduct
  await loadCatalog()
  window.dispatchEvent(new Event('bun_catalog_updated'))
  return resultItem
}

export async function deleteCatalogProduct(slug) {
  try {
    await deleteProduct(slug)
  } catch (e) {
    console.warn('API delete product notice:', e.message)
  }

  const current = getLocalCatalog().filter((item) => item.slug !== slug)
  storeProducts(current)
  await loadCatalog()
  window.dispatchEvent(new Event('bun_catalog_updated'))
}

export async function uploadCatalogProductImage(slug, file) {
  return uploadProductImage(slug, file)
}
