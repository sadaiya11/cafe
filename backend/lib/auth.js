import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m'

export const ADMIN_ROLES = new Set(['ADMIN', 'STAFF'])

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.')
  }
  return secret
}

export function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}

export function isPasswordHash(value) {
  return typeof value === 'string' && /^\$2[aby]?\$\d{2}\$/.test(value)
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN },
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret())
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    city: user.city || '',
    zip: user.zip || '',
    role: user.role,
  }
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}