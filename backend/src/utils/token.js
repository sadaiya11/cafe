const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET || 'development-only-secret-change-me'
function signToken(user) { return jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' }) }
function safeUser(user) { return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } }
module.exports = { signToken, safeUser, secret }
