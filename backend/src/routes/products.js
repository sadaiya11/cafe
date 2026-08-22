const router = require('express').Router()
const { readStore } = require('../data/store')
router.get('/', (req, res) => {
  const { category, search } = req.query
  let items = readStore().products
  if (category && category !== 'All') items = items.filter((item) => item.category === category)
  if (search) { const term = search.toLowerCase(); items = items.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(term)) }
  res.json(items)
})
router.get('/:id', (req, res) => { const product = readStore().products.find((item) => item.id === req.params.id); product ? res.json(product) : res.status(404).json({ message: 'Product not found.' }) })
module.exports = router
