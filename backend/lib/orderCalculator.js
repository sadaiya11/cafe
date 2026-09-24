import fs from 'node:fs'

const productsData = JSON.parse(
  fs.readFileSync(new URL('../../src/data/products.json', import.meta.url), 'utf-8')
)

export const SERVER_COUPONS = [
  { code: 'BUN20', type: 'PERCENT', value: 20, minOrder: 150 },
  { code: 'FIRST50', type: 'FLAT', value: 50, minOrder: 200 },
  { code: 'FREESHIP', type: 'FLAT', value: 40, minOrder: 100 },
  { code: 'FIRSTBUN', type: 'FLAT', value: 35, minOrder: 0 },
  { code: 'FIRSTFREE', type: 'FLAT', value: 35, minOrder: 0 },
]

export const SERVER_DEFAULT_SETTINGS = {
  deliveryFee: 20,
  taxRate: 0,
  freeDeliveryThreshold: 220,
}

/**
 * Authoritative Server-Side Order Recalculator Engine
 * Enforces product pricing, stock availability, quantity limits, coupon rules, tax and delivery fees on backend.
 */
export async function recalculateOrderOnServer({ items = [], couponCode = '', paymentMethod = '', isFirstOrder = false, customer = null, catalogProducts = null, storeSettings = null, dbOrders = null }) {
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

  const taxRate = settings.taxRate !== undefined && settings.taxRate !== null ? Number(settings.taxRate) : 0
  const deliveryFee = settings.deliveryFee !== undefined && settings.deliveryFee !== null ? Number(settings.deliveryFee) : 20
  const freeDeliveryThreshold = settings.freeDeliveryThreshold !== undefined && settings.freeDeliveryThreshold !== null ? Number(settings.freeDeliveryThreshold) : 220

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

  // Authoritative Check: Validate First Order eligibility by customer phone & email against database
  let effectiveFirstOrder = isFirstOrder !== undefined && isFirstOrder !== null ? Boolean(isFirstOrder) : true
  if (customer && Array.isArray(dbOrders)) {
    const custPhone = String(customer.phone || customer.mobile || '').trim().toLowerCase()
    const custEmail = String(customer.email || '').trim().toLowerCase()
    if (custPhone || custEmail) {
      const hasPreviousOrder = dbOrders.some((o) => {
        const c = o.customer && typeof o.customer === 'object' ? o.customer : {}
        const p = String(c.phone || c.mobile || '').trim().toLowerCase()
        const e = String(c.email || '').trim().toLowerCase()
        return (custPhone && p && p === custPhone) || (custEmail && e && e === custEmail)
      })
      if (hasPreviousOrder) {
        effectiveFirstOrder = false
      }
    }
  }

  // Calculate First Order Free Classic Bun Maska Discount
  let firstOrderFreeBunDiscount = 0
  if (effectiveFirstOrder) {
    const freeBunItem = validatedItems.find((i) => (i.slug || '').toLowerCase() === 'classic-bun-maska')
    if (freeBunItem) {
      firstOrderFreeBunDiscount = Number(freeBunItem.price || 35)
    }
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

  // COD Fee Calculation (₹8 for Cash on Delivery for orders under ₹220)
  const isCod = String(paymentMethod || '').toUpperCase() === 'COD'
  const codFee = (isCod && rawSubtotal < 220) ? 8 : 0

  // Tax Calculation
  const discountedSubtotal = Math.max(0, rawSubtotal - couponDiscount - firstOrderFreeBunDiscount)
  const tax = Math.round(discountedSubtotal * taxRate * 100) / 100

  // Final Payable Total Calculation
  const finalPayableTotal = Math.max(0, Math.round((discountedSubtotal + delivery + tax + codFee) * 100) / 100)
  const amountInPaise = Math.round(finalPayableTotal * 100)

  return {
    items: validatedItems,
    subtotal: rawSubtotal,
    couponDiscount,
    firstOrderFreeBunDiscount,
    appliedCoupon,
    deliveryFee: delivery,
    codFee,
    taxAmount: tax,
    finalPayableTotal,
    amountInPaise,
  }
}
