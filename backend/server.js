import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import prisma from './lib/prisma.js'
import { recalculateOrderOnServer } from './lib/orderCalculator.js'
import {
  ADMIN_ROLES,
  getBearerToken,
  hashPassword,
  isPasswordHash,
  sanitizeUser,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from './lib/auth.js'

dotenv.config({ path: '../.env' })
dotenv.config({ path: '.env', override: true })

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json({ limit: '3mb' }))

async function authenticateRequest(req, res, next) {
  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: 'Authentication required.' })

  try {
    const claims = verifyAccessToken(token)
    const user = await prisma.user.findUnique({ where: { id: String(claims.sub) } })
    if (!user || user.tokenVersion !== Number(claims.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' })
    }
    req.auth = { user, claims }
    next()
  } catch (error) {
    return res.status(401).json({ error: error.message.includes('JWT_SECRET') ? 'Authentication is not configured.' : 'Invalid or expired session.' })
  }
}

function requireStaffOrAdmin(req, res, next) {
  if (!req.auth || !ADMIN_ROLES.has(req.auth.user.role)) {
    return res.status(403).json({ error: 'Staff or admin access required.' })
  }
  next()
}

function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required.' })
  }
  next()
}

// Initialize Razorpay Instance safely
const hasRazorpayCredentials = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
)

let razorpay = null
if (hasRazorpayCredentials) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  } catch (e) {
    console.warn('Razorpay initialization warning:', e.message)
  }
}

const PRODUCT_IMAGE_BUCKET = 'product-images'

async function uploadProductImage(slug, dataUrl, contentType = 'image/jpeg') {
  if (!slug || !dataUrl || !String(dataUrl).startsWith('data:image/')) {
    throw new Error('A product slug and image file are required.')
  }
  const storageKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.SUPABASE_URL || !storageKey) {
    throw new Error('Supabase Storage requires SUPABASE_URL and a server Secret key.')
  }

  const [, base64] = String(dataUrl).split(',', 2)
  const file = Buffer.from(base64 || '', 'base64')
  if (!file.length || file.length > 2 * 1024 * 1024) throw new Error('Image must be 2 MB or smaller.')

  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : 'jpg'
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-')
  const objectPath = `products/${safeSlug}-${Date.now()}.${extension}`
  const headers = {
    apikey: storageKey,
    Authorization: `Bearer ${storageKey}`,
  }

  // Creating an existing bucket returns a conflict, which is safe to ignore.
  await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: PRODUCT_IMAGE_BUCKET, name: PRODUCT_IMAGE_BUCKET, public: true }),
  })

  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'false' },
    body: file,
  })
  if (!response.ok) throw new Error(await response.text() || 'Storage upload failed.')

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${objectPath}`
}

// Health Check Endpoint (Includes Supabase & Prisma Status)
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await prisma.user.count().catch(() => 0)
    res.json({
      status: 'ok',
      message: 'Bun Maska Cafe Backend & Supabase Database API is running',
      database: 'Connected to Supabase via Prisma',
      stats: { totalUsers: userCount },
    })
  } catch (err) {
    res.json({ status: 'ok', databaseError: err.message })
  }
})

// Route: POST /api/auth/register - Register a new user in database
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'CUSTOMER' } = req.body
    if (!name || !name.trim() || !email || !email.trim() || !password || !password.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (password.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' })
    }

    const requestedRole = String(role).toUpperCase()
    if (!['ADMIN', 'STAFF'].includes(requestedRole)) {
      return res.status(400).json({ error: 'Admin accounts can only use the ADMIN or STAFF role.' })
    }
    const isRegisteringAdmin = requestedRole === 'ADMIN'
    const expectedAdminSecret = process.env.ADMIN_SECRET_KEY

    if (isRegisteringAdmin) {
      const { adminSecretKey } = req.body
      if (!expectedAdminSecret || !adminSecretKey || String(adminSecretKey).trim() !== expectedAdminSecret) {
        return res.status(403).json({
          error: 'Invalid Admin Security Passcode. Only authorized store managers with the Master Key can register Admin accounts.',
        })
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please login instead.' })
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: await hashPassword(password.trim()),
        role: requestedRole,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token: signAccessToken(newUser),
      user: {
        ...sanitizeUser(newUser),
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register account', details: error.message })
  }
})

// Route: POST /api/auth/login - Authenticate user against database
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !email.trim() || !password || !password.trim()) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    const validPassword = user && user.password
      ? (isPasswordHash(user.password) ? await verifyPassword(password.trim(), user.password) : user.password === password.trim())
      : false
    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    if (user.isAllowedLogin === false || user.disabled === true || user.status === 'DISABLED') {
      return res.status(403).json({ error: 'Your login permission has been disabled by the store administrator. Please contact your manager.' })
    }

    if (!isPasswordHash(user.password)) {
      await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(password.trim()), tokenVersion: { increment: 1 } } })
      user.tokenVersion += 1
    }

    const token = signAccessToken(user)

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: sanitizeUser(user),
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to authenticate user', details: error.message })
  }
})

app.post('/api/auth/logout', authenticateRequest, async (req, res) => {
  await prisma.user.update({ where: { id: req.auth.user.id }, data: { tokenVersion: { increment: 1 } } })
  res.json({ success: true })
})

// Route: PUT /api/auth/profile - Update user profile (Name, Phone, Address, City, Zip)
app.put('/api/auth/profile', authenticateRequest, async (req, res) => {
  try {
    // RULE 4: Proof of identity is strictly req.auth.user (from verified JWT), NEVER customer-supplied body email!
    const normalizedEmail = req.auth.user.email.trim().toLowerCase()
    const { name, phone, address, city, zip } = req.body

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!existingUser) {
      return res.status(404).json({ error: 'User account not found.' })
    }

    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(address !== undefined ? { address: String(address).trim() } : {}),
        ...(city !== undefined ? { city: String(city).trim() } : {}),
        ...(zip !== undefined ? { zip: String(zip).trim() } : {}),
      },
    })

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        ...sanitizeUser(updatedUser),
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'Failed to update profile', details: error.message })
  }
})

// Route: GET /api/admin/users - Fetch All Registered Users for Admin Dashboard
app.get('/api/admin/users', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        zip: true,
        role: true,
        isAllowedLogin: true,
        createdAt: true,
      },
    })
    const sanitized = users.map((u) => ({
      ...u,
      isAllowedLogin: u.isAllowedLogin !== false && u.disabled !== true && u.status !== 'DISABLED',
    }))
    res.json(sanitized)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    res.status(500).json({ error: 'Failed to fetch registered users', details: error.message })
  }
})

app.patch('/api/admin/users/:id', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id
    const { isAllowedLogin, role } = req.body || {}
    const updateData = {}
    if (isAllowedLogin !== undefined) updateData.isAllowedLogin = Boolean(isAllowedLogin)
    if (role !== undefined) updateData.role = String(role)
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })
    res.json({ success: true, user: sanitizeUser(user) })
  } catch (error) {
    console.error('Error updating admin user:', error)
    res.status(500).json({ error: 'Failed to update user', details: error.message })
  }
})

app.delete('/api/admin/users/:id', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id
    await prisma.user.delete({ where: { id: userId } })
    res.json({ success: true, message: 'Staff member deleted/unregistered.' })
  } catch (error) {
    console.error('Error deleting admin user:', error)
    res.status(500).json({ error: 'Failed to delete user', details: error.message })
  }
})

app.post('/api/admin/staff', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, role = 'STAFF' } = req.body || {}
    if (!name || !name.trim() || !email || !email.trim() || !password || !password.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required.' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' })
    }
    const userRole = ['ADMIN', 'STAFF'].includes(String(role).toUpperCase()) ? String(role).toUpperCase() : 'STAFF'
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: await hashPassword(password.trim()),
        phone: phone ? String(phone).trim() : '',
        role: userRole,
        isAllowedLogin: true,
      },
    })
    res.status(201).json({ success: true, user: sanitizeUser(newUser) })
  } catch (error) {
    console.error('Error registering staff:', error)
    res.status(500).json({ error: 'Failed to register staff member', details: error.message })
  }
})



const getResetTokenSecret = () => process.env.RESET_TOKEN_SECRET || process.env.SUPABASE_SECRET_KEY

const createResetToken = (email, expiresAt) => {
  const payload = Buffer.from(JSON.stringify({ email, expiresAt })).toString('base64url')
  const signature = crypto.createHmac('sha256', getResetTokenSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

const verifyResetToken = (token, email) => {
  const secret = getResetTokenSecret()
  const [payload, signature] = token.split('.')
  if (!secret || !payload || !signature) return false

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false

  try {
    const tokenData = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return tokenData.email === email && tokenData.expiresAt > Date.now()
  } catch {
    return false
  }
}

async function sendResetEmail(toEmail, resetLink) {
  const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER || 'sadaiya11@gmail.com'
  const emailPass = process.env.EMAIL_PASSWORD || process.env.GMAIL_PASS || process.env.EMAIL_PASS || 'jbcr skgv pilj jbsg'
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com'
  const emailPort = Number(process.env.EMAIL_PORT) || 587
  const emailFrom = process.env.EMAIL_FROM || `Bun Maska Cafe <${emailUser}>`

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #ea580c; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Bun Maska Café</h1>
        <p style="color: #64748b; font-size: 13px; font-weight: 600; margin-top: 4px;">Artisanal Breads, Irani Chai & Gourmet Snacks</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
        <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          We received a password reset request for your account (<strong>${toEmail}</strong>). Click the button below to set a new password:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 800; border-radius: 9999px; display: inline-block; font-size: 14px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);">
            🔑 Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
          If you did not request this email, you can safely ignore it. Your account password will remain unchanged.<br>
          <em>This link is valid for 1 hour.</em>
        </p>
      </div>
    </div>
  `

  // 1. Try Nodemailer SMTP (exact match with school-erp project)
  if (emailHost && emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: { user: emailUser, pass: emailPass },
      })
      await transporter.sendMail({
        from: emailFrom,
        to: toEmail,
        subject: '🔑 Reset Your Bun Maska Café Password',
        html: htmlContent,
      })
      console.log(`📧 Nodemailer SMTP email sent successfully to ${toEmail}`)
      return { success: true }
    } catch (err) {
      console.warn('⚠️ Nodemailer SMTP send error:', err.message)
      return { success: false, error: err.message }
    }
  }

  // 2. Try Resend API
  const resendApiKey = process.env.RESEND_API_KEY
  let resendFrom = process.env.RESEND_FROM_EMAIL || 'Bun Maska Cafe <onboarding@resend.dev>'
  if (resendFrom.includes('@gmail.com')) {
    resendFrom = 'Bun Maska Cafe <onboarding@resend.dev>'
  }

  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey)
      const { error } = await resend.emails.send({
        from: resendFrom,
        to: toEmail,
        subject: '🔑 Reset Your Bun Maska Café Password',
        html: htmlContent,
      })
      if (error) return { success: false, error: typeof error === 'object' ? error.message : String(error) }
      console.log(`📧 Resend email sent successfully to ${toEmail}`)
      return { success: true }
    } catch (e) {
      console.warn('⚠️ Resend email send error:', e.message)
      return { success: false, error: e.message }
    }
  }

  return { success: false, error: 'Password reset email service is not configured.' }
}

// Route: POST /api/auth/forgot-password - Send password reset link to user's email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, origin } = req.body
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please provide a valid registered email address.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address. Please register first.' })
    }

    // Generate secure random reset token
    const expiresAt = Date.now() + 60 * 60 * 1000 // Valid for 1 hour
    if (!getResetTokenSecret()) {
      return res.status(503).json({ error: 'Password reset email service is not configured.' })
    }
    const token = createResetToken(normalizedEmail, expiresAt)

    const baseUrl = origin || `${req.protocol}://${req.get('host')}`
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`

    const sendResult = await sendResetEmail(normalizedEmail, resetLink)
    if (!sendResult.success) {
      return res.status(503).json({ error: sendResult.error || 'Failed to send verification email. Please check server configuration.' })
    }

    res.json({
      success: true,
      message: `Password reset verification link has been sent to ${normalizedEmail}! Please check your email.`,
      email: normalizedEmail,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Failed to process password reset request', details: error.message })
  }
})

// Route: POST /api/auth/reset-password - Verify link token and update user password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body

    if (!email || !token || !newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: 'Email, token, and a new password are required.' })
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!verifyResetToken(token, normalizedEmail)) {
      return res.status(400).json({ error: 'Password reset link is invalid or has expired. Please request a new one.' })
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' })
    }

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: await hashPassword(newPassword.trim()), tokenVersion: { increment: 1 } },
    })

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password', details: error.message })
  }
})

// Route: PUT /api/auth/change-password - Change user password directly from Profile page
app.put('/api/auth/change-password', authenticateRequest, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (req.auth.user.email !== normalizedEmail) return res.status(403).json({ error: 'You can only change your own password.' })
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' })
    }

    const currentPasswordValid = user.password && isPasswordHash(user.password)
      ? await verifyPassword(currentPassword.trim(), user.password)
      : user.password === currentPassword.trim()
    if (!currentPasswordValid) {
      return res.status(400).json({ error: 'Incorrect current password. Please try again or use email reset.' })
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' })
    }

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: await hashPassword(newPassword.trim()), tokenVersion: { increment: 1 } },
    })

    res.json({
      success: true,
      message: 'Password updated successfully!',
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Failed to change password', details: error.message })
  }
})

// Route: GET /api/db/products - Fetch All Products from Supabase DB via Prisma
app.get('/api/db/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany()
    const customerProducts = products.filter((p) => p.slug && !p.slug.startsWith('_system_') && p.category !== '_system')
    res.json(customerProducts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', details: error.message })
  }
})


// Route: PUT /api/db/products/:slug - Update the fields shown to customers.
app.put('/api/db/products/:slug', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const slug = req.params.slug
    const { title, category, tag, description, price, image, variants, inStock } = req.body
    const numPrice = Number(price)
    if (!slug || !title || !Number.isFinite(numPrice)) {
      return res.status(400).json({ error: 'Slug, title, and a valid price are required.' })
    }

    const normalizedCategory = category || 'Bun Maska'
    const normalizedDesc = description !== undefined && description !== null ? String(description) : ''
    const normalizedVariants = Array.isArray(variants) && variants.length
      ? variants.map((v, i) => (i === 0 ? { ...v, price: numPrice } : v))
      : [{ size: 'standard', label: 'Standard', price: numPrice, image: image || '' }]

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        title,
        category: normalizedCategory,
        tag: tag || '',
        description: normalizedDesc,
        price: numPrice,
        image: image || '',
        variants: normalizedVariants,
        inStock: inStock !== false,
      },
      create: {
        slug,
        title,
        category: normalizedCategory,
        tag: tag || '',
        description: normalizedDesc,
        price: numPrice,
        image: image || '',
        variants: normalizedVariants,
        inStock: inStock !== false,
      },
    })
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: 'Failed to save product', details: error.message })
  }
})

// Route: DELETE /api/db/products/:slug - Delete Product from Supabase DB via Prisma
app.delete('/api/db/products/:slug', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const slug = req.params.slug
    await prisma.product.delete({ where: { slug } })
    res.json({ success: true, slug })
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: 'Failed to delete product', details: error.message })
  }
})

// Route: POST /api/db/product-images - Upload a customer-visible product image.
app.post('/api/db/product-images', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const { slug, image, contentType } = req.body
    const imageUrl = await uploadProductImage(slug, image, contentType)
    res.status(201).json({ imageUrl })
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload product image', details: error.message })
  }
})

const SLIDE_IMAGE_BUCKET = 'hero-banner-slider'

async function uploadSlideImage(slideId, dataUrl, contentType = 'image/jpeg') {
  if (!dataUrl || !String(dataUrl).startsWith('data:image/')) {
    throw new Error('An image file is required.')
  }
  const storageKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  if (!process.env.SUPABASE_URL || !storageKey) {
    throw new Error('Supabase Storage requires SUPABASE_URL and a key.')
  }

  const [, base64] = String(dataUrl).split(',', 2)
  const file = Buffer.from(base64 || '', 'base64')
  if (!file.length || file.length > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.')

  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : 'jpg'
  const safeId = (slideId || 'slide').replace(/[^a-z0-9-]/gi, '-')
  const objectPath = `slides/${safeId}-${Date.now()}.${extension}`
  const headers = {
    apikey: storageKey,
    Authorization: `Bearer ${storageKey}`,
  }

  await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: SLIDE_IMAGE_BUCKET, name: SLIDE_IMAGE_BUCKET, public: true }),
  }).catch(() => { })
  await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket/${SLIDE_IMAGE_BUCKET}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ public: true }),
  }).catch(() => { })


  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${SLIDE_IMAGE_BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: file,
  })
  if (!response.ok) throw new Error(await response.text() || 'Storage upload failed.')

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${SLIDE_IMAGE_BUCKET}/${objectPath}`
}

// Route: POST /api/db/slide-images - Upload a slide banner image to hero-banner-slider bucket.
app.post('/api/db/slide-images', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const { slideId, image, contentType } = req.body
    const imageUrl = await uploadSlideImage(slideId, image, contentType)
    res.status(201).json({ imageUrl })
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload slide image', details: error.message })
  }
})


// Route: POST /api/db/orders - Save Order into Supabase DB via Prisma
app.post('/api/db/orders', async (req, res) => {
  try {
    const { orderId, customer, items = [], couponCode, paymentId, paymentMethod, paymentStatus, status = 'CONFIRMED' } = req.body

    const existingOrder = orderId
      ? await prisma.order.findUnique({ where: { orderId }, include: { items: true } })
      : null
    if (existingOrder) {
      return res.status(200).json({ success: true, order: existingOrder, alreadyExists: true })
    }

    // 🛡️ Authoritative Server-Side Price & Order Recalculation
    const dbProducts = await prisma.product.findMany().catch(() => null)
    let calculated
    try {
      calculated = await recalculateOrderOnServer({
        items,
        couponCode,
        catalogProducts: dbProducts,
        storeSettings: serverSettingsData || null,
      })
    } catch (calcErr) {
      return res.status(400).json({ error: calcErr.message })
    }

    const newOrder = await prisma.order.create({
      data: {
        orderId: orderId || `BM-${Date.now()}`,
        customer: customer || {},
        amount: calculated.finalPayableTotal, // AUTHORITATIVE RECALCULATED AMOUNT
        currency: 'INR',
        status,
        paymentId,
        paymentMethod,
        paymentStatus,
        items: {
          create: calculated.items.map((item) => ({
            title: item.title,
            size: item.sizeLabel || item.size || 'standard',
            quantity: Number(item.quantity),
            price: Number(item.price), // AUTHORITATIVE UNIT PRICE
          })),
        },
      },
      include: { items: true },
    })

    res.status(201).json({ success: true, order: newOrder, calculated })
  } catch (error) {
    console.error('Error saving order to Supabase:', error)
    res.status(500).json({ error: 'Failed to save order to database', details: error.message })
  }
})

// Route: GET /api/db/orders - Fetch Orders from Supabase DB via Prisma
app.get('/api/db/orders', authenticateRequest, async (req, res) => {
  try {
    const isStaff = ADMIN_ROLES.has(req.auth.user.role)
    const userEmail = req.auth.user.email.toLowerCase()

    // RULE 4: Proof of identity is strictly req.auth.user (from verified JWT), NEVER customer-supplied query parameter!
    // RULE 1: A customer can ONLY view their own orders.
    // RULE 2 & 3: An admin can view all orders or search by customer email after server-side authorization.

    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!isStaff) {
      // Non-admin customer: strictly filter by verified token email!
      const customerOrders = orders.filter((o) =>
        o.customer && typeof o.customer === 'object' && String(o.customer.email).toLowerCase() === userEmail
      )
      return res.json(customerOrders)
    }

    // Admin staff: can view all orders or filter by customer search query
    const { email: searchEmail } = req.query
    const result = searchEmail
      ? orders.filter((o) => o.customer && typeof o.customer === 'object' && String(o.customer.email).toLowerCase() === String(searchEmail).toLowerCase())
      : orders

    res.json(result)
  } catch (error) {
    console.error('Error fetching orders from Supabase:', error)
    res.status(500).json({ error: 'Failed to fetch orders from database', details: error.message })
  }
})

app.patch('/api/db/orders/:orderId/status', authenticateRequest, requireStaffOrAdmin, async (req, res) => {
  try {
    const allowedStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PAID']
    const { status } = req.body
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status.' })
    }

    const order = await prisma.order.update({
      where: { orderId: req.params.orderId },
      data: { status },
      include: { items: true },
    })
    res.json(order)
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: 'Failed to update order status.', details: error.message })
  }
})

/**
 * Route: POST /api/payments/create-order
 * Description: Create a new Razorpay order (or mock order if secret key not set) with server-calculated amount
 */
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { items = [], couponCode, currency = 'INR' } = req.body

    // 🛡️ Authoritative Server-Side Price & Order Recalculation
    const dbProducts = await prisma.product.findMany().catch(() => null)
    let calculated
    try {
      calculated = await recalculateOrderOnServer({
        items,
        couponCode,
        catalogProducts: dbProducts,
        storeSettings: serverSettingsData || null,
      })
    } catch (calcErr) {
      return res.status(400).json({ error: calcErr.message })
    }

    if (!hasRazorpayCredentials || !razorpay) {
      return res.json({
        id: `order_demo_${Date.now()}`,
        entity: 'order',
        amount: calculated.amountInPaise,
        currency,
        receipt: `receipt_${Date.now()}`,
        status: 'created',
        isDemo: true,
        calculated,
      })
    }

    const options = {
      amount: calculated.amountInPaise, // SERVER RECALCULATED AMOUNT IN PAISE
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        company: 'Bun Maska Cafe',
      },
    }

    const order = await razorpay.orders.create(options)
    res.json({ ...order, calculated })
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    res.status(500).json({
      error: 'Failed to create Razorpay order',
      details: error.message,
    })
  }
})

/**
 * Route: POST /api/payments/verify
 * Description: Robust payment verification (Amount check, direct Razorpay status check, duplicate rejection & failure handling)
 */
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, items, couponCode } = req.body || {}
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment verification details.' })
    }

    // 1. REJECT DUPLICATE PAYMENT PROCESSING
    if (razorpay_order_id) {
      const existingOrder = await prisma.order.findUnique({ where: { orderId: razorpay_order_id } }).catch(() => null)
      if (existingOrder && (existingOrder.paymentStatus === 'SUCCESS' || existingOrder.status === 'PAID')) {
        return res.json({
          success: true,
          message: 'Payment has already been processed successfully.',
          alreadyProcessed: true,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          order: existingOrder,
        })
      }
    }

    // 2. AUTHORITATIVE SERVER-SIDE PRICE & TOTAL RECALCULATION
    const dbProducts = await prisma.product.findMany().catch(() => null)
    let calculated
    try {
      calculated = await recalculateOrderOnServer({
        items,
        couponCode,
        catalogProducts: dbProducts,
        storeSettings: serverSettingsData || null,
      })
    } catch (calcErr) {
      return res.status(400).json({ error: `Server recalculation failed: ${calcErr.message}` })
    }

    // 3. DEMO MODE FALLBACK (When credentials unconfigured)
    if (!keyId || !keySecret) {
      if (String(razorpay_order_id).startsWith('order_demo_')) {
        const createdOrder = await prisma.order.create({
          data: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            customer: customer || {},
            amount: calculated.finalPayableTotal,
            status: 'PAID',
            paymentMethod: 'RAZORPAY',
            paymentStatus: 'SUCCESS',
            items: {
              create: calculated.items.map((item) => ({
                title: item.title,
                size: item.sizeLabel || item.size || 'standard',
                quantity: Number(item.quantity),
                price: Number(item.price),
              })),
            },
          },
          include: { items: true },
        }).catch(() => null)

        return res.json({
          success: true,
          message: 'Demo payment verified successfully',
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          order: createdOrder,
          calculated,
        })
      }
      return res.status(503).json({ error: 'Razorpay payment gateway is not configured on the server.' })
    }

    // 4. VERIFY HMAC SIGNATURE
    const expectedSign = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (razorpay_signature !== expectedSign) {
      await prisma.order.create({
        data: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          customer: customer || {},
          amount: calculated.finalPayableTotal,
          status: 'CANCELLED',
          paymentMethod: 'RAZORPAY',
          paymentStatus: 'FAILED',
        },
      }).catch(() => null)
      return res.status(400).json({ success: false, error: 'Invalid payment signature' })
    }

    // 5. VERIFY PAYMENT STATUS DIRECTLY WITH RAZORPAY API
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
    let rzpPayment = null
    let rzpOrder = null

    try {
      const payResp = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
        headers: { Authorization: authHeader },
      })
      if (payResp.ok) rzpPayment = await payResp.json()
    } catch (e) {
      console.warn('Direct Razorpay payment status check warning:', e.message)
    }

    try {
      const ordResp = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`, {
        headers: { Authorization: authHeader },
      })
      if (ordResp.ok) rzpOrder = await ordResp.json()
    } catch (e) {
      console.warn('Direct Razorpay order status check warning:', e.message)
    }

    if (rzpPayment && ['failed', 'refunded'].includes(rzpPayment.status)) {
      await prisma.order.create({
        data: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          customer: customer || {},
          amount: calculated.finalPayableTotal,
          status: 'CANCELLED',
          paymentMethod: 'RAZORPAY',
          paymentStatus: 'FAILED',
        },
      }).catch(() => null)
      return res.status(400).json({ success: false, error: `Payment failed on Razorpay gateway (status: ${rzpPayment.status})` })
    }

    // 6. VERIFY RAZORPAY AMOUNT MATCHES SERVER-CALCULATED ORDER TOTAL
    const rzpAmountInPaise = Number(rzpPayment?.amount ?? rzpOrder?.amount ?? 0)
    if (rzpAmountInPaise > 0 && Math.abs(rzpAmountInPaise - calculated.amountInPaise) > 100) {
      await prisma.order.create({
        data: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          customer: customer || {},
          amount: calculated.finalPayableTotal,
          status: 'CANCELLED',
          paymentMethod: 'RAZORPAY',
          paymentStatus: 'FAILED',
        },
      }).catch(() => null)
      return res.status(400).json({
        success: false,
        error: `Payment amount mismatch: expected ₹${calculated.finalPayableTotal} but received ₹${(rzpAmountInPaise / 100).toFixed(2)}`,
      })
    }

    // 7. STORE GATEWAY ORDER ID AND PAYMENT ID IN DATABASE WITH SUCCESS STATUS
    const createdOrder = await prisma.order.create({
      data: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        customer: customer || {},
        amount: calculated.finalPayableTotal,
        status: 'PAID',
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'SUCCESS',
        items: {
          create: calculated.items.map((item) => ({
            title: item.title,
            size: item.sizeLabel || item.size || 'standard',
            quantity: Number(item.quantity),
            price: Number(item.price),
          })),
        },
      },
      include: { items: true },
    }).catch(() => null)

    return res.json({
      success: true,
      message: 'Payment verified and saved to database successfully',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      order: createdOrder,
      calculated,
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    res.status(500).json({
      error: 'Payment verification error',
      details: error.message,
    })
  }
})

/**
 * Route: POST /api/payments/webhook
 * Description: Handle Razorpay Webhook Events (payment.captured, payment.failed, order.paid)
 */
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET
    const signature = req.headers['x-razorpay-signature'] || req.headers['X-Razorpay-Signature']

    if (!webhookSecret || !signature) {
      return res.status(400).json({ error: 'Webhook secret or signature missing.' })
    }

    const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex')

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature.' })
    }

    const eventObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const event = eventObj.event
    const payload = eventObj.payload || {}

    console.log(`🔔 Razorpay Webhook Event received: ${event}`)

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payment?.entity || {}
      const orderId = payment.order_id || payload.order?.entity?.id

      if (orderId) {
        await prisma.order.update({
          where: { orderId },
          data: { status: 'PAID', paymentStatus: 'SUCCESS' },
        }).catch(() => null)
      }
      return res.json({ status: 'ok', event, processed: true })
    }

    if (event === 'payment.failed') {
      const payment = payload.payment?.entity || {}
      const orderId = payment.order_id
      if (orderId) {
        await prisma.order.update({
          where: { orderId },
          data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
        }).catch(() => null)
      }
      return res.json({ status: 'ok', event, processed: true })
    }

    return res.json({ status: 'ok', event, processed: true })
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error)
    res.status(500).json({ error: 'Webhook processing error', details: error.message })
  }
})

const DEFAULT_SETTINGS = {
  isStoreOpen: true,
  storeClosedNotice: 'Our cafe daily operating hours: 11:00 AM - 11:30 PM.',
  deliveryFee: 4.99,
  taxRate: 0.08,
  freeDeliveryThreshold: 500,
  storeName: 'Bun Maska Café',
  phone: '8085700750',
  email: 'amansoni16041996@gmail.com',
  address: 'Sisodiya Colony, Guna M.P.',
  city: 'Guna, M.P.',
  zip: '473001',
  hours: 'Mon - Sun: 11:00 AM - 11:30 PM',
  openHour: 11,
  openMinute: 0,
  closeHour: 23,
  closeMinute: 30,
}

const DEFAULT_HERO_SLIDES = [
  {
    id: "slide-1",
    title: "Classic Taste • Premium Maska",
    subtitle: "Freshly grilled Bun Maska, Nutella Bun Maska, and Rabdi Bun Maska made with love.",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1500&q=80",
    badge: "Signature Buns"
  },
  {
    id: "slide-2",
    title: "Maggi, Momos & Loaded Fries",
    subtitle: "Tadka Maggi, Cheese Peri Peri Fries, and Crispy Momos for every hunger craving.",
    image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=1500&q=80",
    badge: "Har Bite Me Maska"
  },
  {
    id: "slide-3",
    title: "Maska Loaded Sandwiches",
    subtitle: "Double-decker loaded sandwiches packed with fresh veggies, extra cheese & signature butter.",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1500&q=80",
    badge: "Chef Special"
  }
]

const DEFAULT_COUPONS = [
  {
    code: 'BUN20',
    type: 'PERCENT',
    value: 20,
    minOrder: 150,
    description: 'Get 20% OFF on orders above ₹150',
    active: true,
  },
  {
    code: 'FIRST50',
    type: 'FLAT',
    value: 50,
    minOrder: 200,
    description: 'Flat ₹50 OFF on orders above ₹200',
    active: true,
  },
  {
    code: 'FREESHIP',
    type: 'FLAT',
    value: 40,
    minOrder: 100,
    description: 'Free Delivery (Save ₹40)',
    active: true,
  },
]

const DEFAULT_REVIEWS = []

// Store Settings, Hero Slides, Coupons & Reviews Server Cache & Database Persistence
let serverSettingsData = null
let serverSlidesData = null
let serverCouponsData = null
const serverReviewsMap = new Map()

async function getDbSettings() {
  try {
    const item = await prisma.product.findUnique({ where: { slug: '_system_store_settings' } })
    if (item && item.variants) {
      serverSettingsData = item.variants
      return item.variants
    }
  } catch (err) { }
  return serverSettingsData || DEFAULT_SETTINGS
}

async function saveDbSettings(settings) {
  serverSettingsData = settings
  try {
    await prisma.product.upsert({
      where: { slug: '_system_store_settings' },
      update: { variants: settings },
      create: {
        slug: '_system_store_settings',
        title: 'System Store Settings',
        category: '_system',
        description: 'System settings for cafe profile, contact info and rates',
        price: 0,
        image: '',
        variants: settings,
        inStock: false,
      },
    })
  } catch (err) {
    console.warn('Prisma save settings warning:', err.message)
  }
}

async function getDbSlides() {
  try {
    const item = await prisma.product.findUnique({ where: { slug: '_system_hero_slides' } })
    if (item && Array.isArray(item.variants)) {
      serverSlidesData = item.variants
      return item.variants
    }
  } catch (err) { }
  return serverSlidesData || DEFAULT_HERO_SLIDES
}

async function saveDbSlides(slides) {
  serverSlidesData = slides
  try {
    await prisma.product.upsert({
      where: { slug: '_system_hero_slides' },
      update: { variants: slides },
      create: {
        slug: '_system_hero_slides',
        title: 'System Hero Slides',
        category: '_system',
        description: 'Homepage Hero Slides',
        price: 0,
        image: '',
        variants: slides,
        inStock: false,
      },
    })
  } catch (err) {
    console.warn('Prisma save slides warning:', err.message)
  }
}

async function getDbCoupons() {
  try {
    const item = await prisma.product.findUnique({ where: { slug: '_system_store_coupons' } })
    if (item && Array.isArray(item.variants)) {
      serverCouponsData = item.variants
      return item.variants
    }
  } catch (err) { }
  return serverCouponsData || DEFAULT_COUPONS
}

async function saveDbCoupons(coupons) {
  serverCouponsData = coupons
  try {
    await prisma.product.upsert({
      where: { slug: '_system_store_coupons' },
      update: { variants: coupons },
      create: {
        slug: '_system_store_coupons',
        title: 'System Store Coupons',
        category: '_system',
        description: 'System coupons for promotional discounts',
        price: 0,
        image: '',
        variants: coupons,
        inStock: false,
      },
    })
  } catch (err) {
    console.warn('Prisma save coupons warning:', err.message)
  }
}

async function getAllDbReviews() {
  const allReviews = []
  try {
    const items = await prisma.product.findMany({
      where: { slug: { startsWith: '_system_reviews_' } }
    })
    for (const item of items) {
      const pSlug = item.slug.replace('_system_reviews_', '')
      const revs = Array.isArray(item.variants) ? item.variants : []
      revs.forEach((r) => allReviews.push({ ...r, productSlug: r.productSlug || pSlug }))
    }
  } catch (err) {}

  for (const [pSlug, revs] of serverReviewsMap.entries()) {
    if (Array.isArray(revs)) {
      revs.forEach((r) => {
        if (!allReviews.some((existing) => existing.id === r.id)) {
          allReviews.push({ ...r, productSlug: r.productSlug || pSlug })
        }
      })
    }
  }
  return allReviews
}

async function getDbReviews(slug) {
  if (!slug) return getAllDbReviews()
  try {
    const item = await prisma.product.findUnique({ where: { slug: `_system_reviews_${slug}` } })
    if (item && Array.isArray(item.variants)) {
      serverReviewsMap.set(slug, item.variants)
      return item.variants
    }
  } catch (err) { }
  return serverReviewsMap.get(slug) || DEFAULT_REVIEWS
}

async function addDbReview(slug, reviewData) {
  const targetSlug = slug || reviewData?.slug
  const currentList = await getDbReviews(targetSlug)
  const newRev = {
    id: Date.now(),
    name: String(reviewData.name).trim(),
    rating: Number(reviewData.rating || 5),
    comment: String(reviewData.comment).trim(),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    productSlug: targetSlug,
  }
  const updatedList = [newRev, ...(Array.isArray(currentList) ? currentList : [])]
  serverReviewsMap.set(targetSlug, updatedList)
  try {
    await prisma.product.upsert({
      where: { slug: `_system_reviews_${targetSlug}` },
      update: { variants: updatedList },
      create: {
        slug: `_system_reviews_${targetSlug}`,
        title: `System Reviews for ${targetSlug}`,
        category: '_system',
        description: `Customer reviews for ${targetSlug}`,
        price: 0,
        image: '',
        variants: updatedList,
        inStock: false,
      },
    })
  } catch (err) {
    console.warn('Prisma add review warning:', err.message)
  }
  return { updatedList, newRev }
}

app.get('/api/db/settings', async (req, res) => {
  res.json(await getDbSettings())
})

app.put('/api/db/settings', authenticateRequest, requireAdmin, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid settings body.' })
  }
  await saveDbSettings(req.body)
  res.json({ success: true, settings: req.body })
})

app.post('/api/db/settings', authenticateRequest, requireAdmin, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid settings body.' })
  }
  await saveDbSettings(req.body)
  res.json({ success: true, settings: req.body })
})

app.get('/api/db/slides', async (req, res) => {
  res.json(await getDbSlides())
})

app.put('/api/db/slides', authenticateRequest, requireAdmin, async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Hero slides body must be an array.' })
  }
  await saveDbSlides(req.body)
  res.json({ success: true, slides: req.body })
})

app.post('/api/db/slides', authenticateRequest, requireAdmin, async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Hero slides body must be an array.' })
  }
  await saveDbSlides(req.body)
  res.json({ success: true, slides: req.body })
})

app.get('/api/db/coupons', async (req, res) => {
  res.json(await getDbCoupons())
})

app.put('/api/db/coupons', authenticateRequest, requireAdmin, async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Coupons body must be an array.' })
  }
  await saveDbCoupons(req.body)
  res.json({ success: true, coupons: req.body })
})

app.post('/api/db/coupons', authenticateRequest, requireAdmin, async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Coupons body must be an array.' })
  }
  await saveDbCoupons(req.body)
  res.json({ success: true, coupons: req.body })
})

app.get('/api/db/reviews', async (req, res) => {
  res.json(await getDbReviews(req.query.slug))
})

app.post('/api/db/reviews', async (req, res) => {
  if (!req.body?.slug || !req.body?.name || !req.body?.comment) {
    return res.status(400).json({ error: 'Product slug, name and comment are required.' })
  }
  const { updatedList, newRev } = await addDbReview(req.body.slug, req.body)
  res.status(201).json({ success: true, reviews: updatedList, newReview: newRev })
})

app.put('/api/db/reviews', async (req, res) => {
  const { slug, reviews } = req.body || {}
  const targetSlug = slug || req.query.slug
  const targetList = Array.isArray(reviews) ? reviews : (Array.isArray(req.body) ? req.body : null)
  if (!targetSlug || !Array.isArray(targetList)) {
    return res.status(400).json({ error: 'Product slug and reviews array are required.' })
  }
  serverReviewsMap.set(targetSlug, targetList)
  try {
    await prisma.product.upsert({
      where: { slug: `_system_reviews_${targetSlug}` },
      update: { variants: targetList },
      create: {
        slug: `_system_reviews_${targetSlug}`,
        title: `System Reviews for ${targetSlug}`,
        category: '_system',
        description: `Customer reviews for ${targetSlug}`,
        price: 0,
        image: '',
        variants: targetList,
        inStock: false,
      },
    })
  } catch (err) {
    console.warn('Prisma save reviews warning:', err.message)
  }
  res.json({ success: true, reviews: targetList })
})

app.listen(PORT, () => {
  console.log(`🚀 Bun Maska Cafe Backend & Supabase Database server running on port ${PORT}`)
})


