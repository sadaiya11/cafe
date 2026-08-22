const router = require('express').Router()
const auth = require('../middleware/auth')
const { readStore, writeStore } = require('../data/store')

router.post('/confirm', auth, (req, res) => {
  const { orderId, cardNumber } = req.body
  if (!cardNumber?.replace(/\s/g, '').match(/^\d{12,19}$/)) return res.status(400).json({ message: 'Enter a valid card number to complete online payment.' })
  const store = readStore(); const order = store.orders.find((item) => item.id === orderId && item.userId === req.user.id)
  if (!order) return res.status(404).json({ message: 'Order not found.' })
  if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'This order is already paid.' })
  order.paymentStatus = 'paid'; order.status = 'Confirmed'; order.paymentId = `PAY-${Date.now().toString().slice(-8)}`; writeStore(store)
  res.json({ order, message: 'Payment successful. Your order is confirmed!' })
})
module.exports = router
