import test from 'node:test'
import assert from 'node:assert/strict'
import { recalculateOrderOnServer } from '../lib/orderCalculator.js'

const catalog = [
  {
    id: 'item-1',
    slug: 'classic-bun-maska',
    title: 'Classic Bun Maska',
    price: 45,
    inStock: true,
    variants: [{ size: 'standard', label: 'Standard', price: 45 }],
  },
]
const settings = { deliveryFee: 20, taxRate: 0, freeDeliveryThreshold: 220, isStoreOpen: true }

const calculate = (overrides = {}) => recalculateOrderOnServer({
  items: [{ slug: 'classic-bun-maska', size: 'standard', quantity: 1, price: 0.01 }],
  catalogProducts: catalog,
  storeSettings: settings,
  dbOrders: [{ customer: { email: 'new@example.com' } }],
  customer: { email: 'new@example.com' },
  ...overrides,
})

test('uses catalog prices, not customer-submitted prices', async () => {
  const result = await calculate()
  assert.equal(result.items[0].price, 45)
  assert.equal(result.subtotal, 45)
  assert.equal(result.finalPayableTotal, 65)
})

test('does not trust a client first-order flag or grant a first-order discount without history data', async () => {
  const result = await calculate({ isFirstOrder: true, dbOrders: null })
  assert.equal(result.firstOrderFreeBunDiscount, 0)
})

test('limits the first-order free bun discount to one item', async () => {
  const result = await calculate({
    items: [{ slug: 'classic-bun-maska', size: 'standard', quantity: 4 }],
    dbOrders: [],
  })
  assert.equal(result.firstOrderFreeBunDiscount, 45)
})

test('only applies active server-configured coupons', async () => {
  const result = await calculate({
    couponCode: 'SAVEALL',
    coupons: [{ code: 'SAVEALL', type: 'FLAT', value: 45, minOrder: 0, active: false }],
  })
  assert.equal(result.couponDiscount, 0)
  assert.equal(result.appliedCoupon, null)
})

test('rejects orders while the store is closed', async () => {
  await assert.rejects(
    calculate({ storeSettings: { ...settings, isStoreOpen: false } }),
    /not accepting orders/i,
  )
})

test('rejects unavailable and out-of-stock products', async () => {
  await assert.rejects(calculate({ items: [{ slug: 'missing', quantity: 1 }]}), /not found or is unavailable/i)
  await assert.rejects(
    calculate({ catalogProducts: [{ ...catalog[0], inStock: false }] }),
    /out of stock/i,
  )
})

test('caps excessive quantities and returns amount in paise', async () => {
  const result = await calculate({ items: [{ slug: 'classic-bun-maska', quantity: 999 }] })
  assert.equal(result.items[0].quantity, 50)
  assert.equal(result.amountInPaise, 225000)
})
