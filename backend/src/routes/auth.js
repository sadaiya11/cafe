const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { randomUUID } = require('crypto')
const { readStore, writeStore } = require('../data/store')
const { signToken, safeUser } = require('../utils/token')
const auth = require('../middleware/auth')

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name?.trim() || !email?.includes('@') || !password || password.length < 6) return res.status(400).json({ message: 'Enter your name, a valid email, and a password of at least 6 characters.' })
  const store = readStore(); const normalizedEmail = email.toLowerCase().trim()
  if (store.users.some((user) => user.email === normalizedEmail)) return res.status(409).json({ message: 'An account with this email already exists.' })
  const user = { id: randomUUID(), name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 10), createdAt: new Date().toISOString() }
  store.users.push(user); writeStore(store)
  res.status(201).json({ user: safeUser(user), token: signToken(user) })
})
router.post('/login', async (req, res) => {
  const { email, password } = req.body; const user = readStore().users.find((item) => item.email === email?.toLowerCase().trim())
  if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' })
  res.json({ user: safeUser(user), token: signToken(user) })
})
router.get('/me', auth, (req, res) => res.json({ user: safeUser(req.user) }))
module.exports = router
