const router = require('express').Router()
const { randomUUID } = require('crypto')
const auth = require('../middleware/auth')
const { readStore, writeStore } = require('../data/store')

router.post('/', auth, (req, res) => {
  const { items, outlet, pickupTime } = req.body
  if (!Array.isArray(items) || !items.length || !outlet?.trim()) return res.status(400).json({ message: 'Cart items and an outlet are required.' })
  const store = readStore()
  const normalizedItems = items.map(({ productId, quantity }) => {
    const product = store.products.find((item) => item.id === productId)
    if (!product || !Number.isInteger(quantity) || quantity < 1) return null
    return { productId, name: product.name, price: product.price, quantity }
  })
  if (normalizedItems.some((item) => !item)) return res.status(400).json({ message: 'One or more cart items are invalid.' })
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const order = { id: randomUUID(), userId: req.user.id, items: normalizedItems, outlet: outlet.trim(), pickupTime: pickupTime || 'ASAP (20–25 min)', subtotal, status: 'Awaiting payment', paymentStatus: 'pending', createdAt: new Date().toISOString() }
  store.orders.push(order); writeStore(store); res.status(201).json({ order })
})
router.get('/my-orders', auth, (req, res) => res.json(readStore().orders.filter((order) => order.userId === req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
module.exports = router
