import productsData from '../../src/data/products.json' assert { type: 'json' }

export const SERVER_COUPONS = [
  { code: 'BUN20', type: 'PERCENT', value: 20, minOrder: 150 },
  { code: 'FIRST50', type: 'FLAT', value: 50, minOrder: 200 },
  { code: 'FREESHIP', type: 'FLAT', value: 40, minOrder: 100 },
]

export const SERVER_DEFAULT_SETTINGS = {
  deliveryFee: 4.99,
  taxRate: 0.08,
  freeDeliveryThreshold: 500,
}

/**
 * Authoritative Server-Side Order Recalculator Engine
 * Enforces product pricing, stock availability, quantity limits, coupon rules, tax and delivery fees on backend.
 */
export async function recalculateOrderOnServer({ items = [], couponCode = '', catalogProducts = null, storeSettings = null }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Order must contain at least one valid food item.')
  }

  const productsList = (Array.isArray(catalogProducts) && catalogProducts.length > 0)
    ? catalogProducts
    : productsData

  const settings = {
    ...SERVER_DEFAULT_SETTINGS,
    ...(storeSettings || {}),
  }

  const taxRate = Number(settings.taxRate) || 0.08
  const deliveryFee = Number(settings.deliveryFee) || 4.99
  const freeDeliveryThreshold = Number(settings.freeDeliveryThreshold) || 500

  const validatedItems = []
  let rawSubtotal = 0

  for (const item of items) {
    const slug = item.slug || item.id || item.productId
    const requestedSize = (item.size || item.sizeLabel || 'standard').toLowerCase()
    const quantity = Math.max(1, Math.min(50, parseInt(item.quantity) || 1))

    const product = productsList.find((p) => (p.slug || '').toLowerCase() === (slug || '').toLowerCase() || p.id === slug)
    if (!product) {
      throw new Error(`Product "${slug}" was not found or is unavailable.`)
    }

    if (product.inStock === false) {
      throw new Error(`Product "${product.title}" is currently out of stock.`)
    }

    const variants = Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants
      : [{ size: 'standard', label: 'Standard', price: product.price }]

    const matchedVariant = variants.find((v) => (v.size || '').toLowerCase() === requestedSize) || variants[0]
    const unitPrice = Number(matchedVariant.price ?? product.price ?? 0)

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid price detected for "${product.title}".`)
    }

    const lineTotal = Math.round(unitPrice * quantity * 100) / 100
    rawSubtotal += lineTotal

    validatedItems.push({
      productId: product.id || product.slug,
      slug: product.slug,
      title: product.title,
      size: matchedVariant.size || 'standard',
      sizeLabel: matchedVariant.label || 'Standard',
      quantity,
      price: unitPrice, // Authoritative DB / Catalog unit price
      totalPrice: lineTotal,
      image: matchedVariant.image || product.image || '',
    })
  }

  // Calculate Coupon Discount
  let couponDiscount = 0
  let appliedCoupon = null

  if (couponCode && String(couponCode).trim()) {
    const code = String(couponCode).trim().toUpperCase()
    const foundCoupon = SERVER_COUPONS.find((c) => c.code === code)

    if (foundCoupon) {
      if (rawSubtotal >= foundCoupon.minOrder) {
        const rawDiscount = foundCoupon.type === 'PERCENT'
          ? Math.round((rawSubtotal * foundCoupon.value) / 100)
          : Number(foundCoupon.value)

        couponDiscount = Math.min(rawSubtotal, rawDiscount)
        appliedCoupon = {
          code: foundCoupon.code,
          discountAmount: couponDiscount,
          type: foundCoupon.type,
          value: foundCoupon.value,
        }
      }
    }
  }

  // Delivery Fee Calculation
  const delivery = rawSubtotal >= freeDeliveryThreshold ? 0 : deliveryFee

  // Tax Calculation
  const discountedSubtotal = Math.max(0, rawSubtotal - couponDiscount)
  const tax = Math.round(discountedSubtotal * taxRate * 100) / 100

  // Final Payable Total Calculation
  const finalPayableTotal = Math.max(0, Math.round((discountedSubtotal + delivery + tax) * 100) / 100)
  const amountInPaise = Math.round(finalPayableTotal * 100)

  return {
    items: validatedItems,
    subtotal: rawSubtotal,
    couponDiscount,
    appliedCoupon,
    deliveryFee: delivery,
    taxAmount: tax,
    finalPayableTotal,
    amountInPaise,
  }
}
