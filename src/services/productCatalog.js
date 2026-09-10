import fallbackProducts from '../data/products.json'
import { getProducts, saveProduct, uploadProductImage } from './api'

const STORAGE_KEY = 'bun_maska_product_catalog'
const DELETED_KEY = 'bun_maska_deleted_slugs'

function getDeletedSlugs() {
  try {
    const stored = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]')
    return Array.isArray(stored) ? new Set(stored) : new Set()
  } catch {
    return new Set()
  }
}

const cloneProducts = (products) => products.map((product) => ({
  ...product,
  variants: (product.variants || []).map((variant) => ({ ...variant, gallery: [...(variant.gallery || [])] })),
}))

export function mergeCatalogProducts(savedProducts = []) {
  const deletedSlugs = getDeletedSlugs()
  const savedBySlug = new Map(savedProducts.map((product) => [product.slug, product]))

  const fallback = cloneProducts(fallbackProducts)
  const merged = fallback
    .filter((product) => !deletedSlugs.has(product.slug))
    .map((product) => {
      const saved = savedBySlug.get(product.slug)
      if (!saved) return { ...product, inStock: product.inStock !== false }

      const variants = Array.isArray(saved.variants) && saved.variants.length
        ? saved.variants
        : product.variants.map((variant, index) => index === 0 && Number.isFinite(Number(saved.price))
          ? { ...variant, price: Number(saved.price) }
          : variant)

      return {
        ...product,
        ...saved,
        title: saved.title || product.title,
        description: saved.description || product.description,
        image: saved.image || product.image,
        variants,
        inStock: saved.inStock !== false,
      }
    })

  const fallbackSlugs = new Set(fallback.map((product) => product.slug))
  const remoteOnly = savedProducts
    .filter((product) => product.slug && !fallbackSlugs.has(product.slug) && !deletedSlugs.has(product.slug))
    .map((product) => ({ ...product, inStock: product.inStock !== false }))

  return [...merged, ...remoteOnly]
}

function getStoredProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function storeProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export function getLocalCatalog() {
  return mergeCatalogProducts(getStoredProducts())
}

export async function loadCatalog() {
  const localProducts = getStoredProducts()
  try {
    const remoteProducts = await getProducts()
    const remoteSlugs = new Set(remoteProducts.map((product) => product.slug))
    return mergeCatalogProducts([...localProducts.filter((product) => !remoteSlugs.has(product.slug)), ...remoteProducts])
  } catch (error) {
    console.warn('Product API unavailable; showing local catalog:', error.message)
    return mergeCatalogProducts(localProducts)
  }
}

export async function updateCatalogProduct(product) {
  const normalized = {
    ...product,
    inStock: product.inStock !== false,
    price: Number(product.variants?.[0]?.price || 0),
    image: product.variants?.[0]?.image || product.image || '',
  }
  const stored = getStoredProducts().filter((item) => item.slug !== normalized.slug)
  storeProducts([...stored, normalized])

  try {
    const saved = await saveProduct(normalized)
    if (saved?.slug) {
      const latestStored = getStoredProducts().filter((item) => item.slug !== saved.slug)
      storeProducts([...latestStored, { ...normalized, ...saved }])
      return mergeCatalogProducts([{ ...normalized, ...saved }]).find((item) => item.slug === product.slug) || normalized
    }
  } catch (err) {
    console.warn('API save notice:', err.message)
  }

  return mergeCatalogProducts([normalized]).find((item) => item.slug === product.slug) || normalized
}

export async function addNewCatalogProduct(productData) {
  const slug = (productData.title || 'item').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4)
  const price = Number(productData.price || 0)
  
  const newProduct = {
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
        price: price,
        image: productData.image || '',
        gallery: productData.image ? [productData.image] : []
      }
    ]
  }

  const stored = getStoredProducts().filter((item) => item.slug !== slug)
  storeProducts([...stored, newProduct])

  try {
    await saveProduct(newProduct)
  } catch (e) {
    console.warn('API save product notice:', e.message)
  }

  return newProduct
}

export async function deleteCatalogProduct(slug) {
  try {
    const deletedKey = DELETED_KEY
    const currentDeleted = JSON.parse(localStorage.getItem(deletedKey) || '[]')
    if (!currentDeleted.includes(slug)) {
      localStorage.setItem(deletedKey, JSON.stringify([...currentDeleted, slug]))
    }
  } catch (e) {
    console.warn('Error marking deleted slug:', e)
  }

  const stored = getStoredProducts().filter((item) => item.slug !== slug)
  storeProducts(stored)
}

export async function uploadCatalogProductImage(slug, file) {
  return uploadProductImage(slug, file)
}
