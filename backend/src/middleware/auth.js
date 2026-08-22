const jwt = require('jsonwebtoken')
const { readStore } = require('../data/store')
const { secret } = require('../utils/token')

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' })
  try {
    const payload = jwt.verify(token, secret)
    const user = readStore().users.find((item) => item.id === payload.id)
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' })
    req.user = user
    next()
  } catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }) }
}
