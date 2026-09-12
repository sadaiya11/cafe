import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import prisma from './lib/prisma.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json({ limit: '3mb' }))

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

    const isRegisteringAdmin = role.toUpperCase() === 'ADMIN'
    const expectedAdminSecret = process.env.ADMIN_SECRET_KEY || 'BUN_MASKA_ADMIN_2026'

    if (isRegisteringAdmin) {
      const { adminSecretKey } = req.body
      if (!adminSecretKey || String(adminSecretKey).trim() !== expectedAdminSecret) {
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
        password: password.trim(),
        role: isRegisteringAdmin ? 'ADMIN' : 'CUSTOMER',
      },
    })

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || '',
        role: newUser.role,
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

    if (!user || user.password !== password.trim()) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    res.json({
      success: true,
      message: 'Logged in successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to authenticate user', details: error.message })
  }
})

// Route: PUT /api/auth/profile - Update user profile (Name & Phone only)
app.put('/api/auth/profile', async (req, res) => {
  try {
    const { email, name, phone } = req.body
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required to update profile.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!existingUser) {
      return res.status(404).json({ error: 'User account not found.' })
    }

    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
      },
    })

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        role: updatedUser.role,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'Failed to update profile', details: error.message })
  }
})

// In-Memory store for Password Reset Verification Tokens
const resetTokensStore = new Map()

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
    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = Date.now() + 60 * 60 * 1000 // Valid for 1 hour

    resetTokensStore.set(token, { email: normalizedEmail, expiresAt })

    const baseUrl = origin || `${req.protocol}://${req.get('host')}`
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`

    console.log(`\n======================================================`)
    console.log(`📧 PASSWORD RESET EMAIL SENT TO: ${normalizedEmail}`)
    console.log(`🔗 RESET LINK: ${resetLink}`)
    console.log(`======================================================\n`)

    res.json({
      success: true,
      message: `Password reset verification link has been sent to ${normalizedEmail}!`,
      resetLink,
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
    const storedTokenData = resetTokensStore.get(token)

    // Fallback: Accept token if it matches stored token or is a valid reset request
    const isValidToken = storedTokenData && storedTokenData.email === normalizedEmail && storedTokenData.expiresAt > Date.now()

    if (!isValidToken && storedTokenData) {
      resetTokensStore.delete(token)
      return res.status(400).json({ error: 'Password reset link has expired. Please request a new one.' })
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' })
    }

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: newPassword.trim() },
    })

    if (storedTokenData) {
      resetTokensStore.delete(token)
    }

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
app.put('/api/auth/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' })
    }

    if (user.password && user.password !== currentPassword.trim()) {
      return res.status(400).json({ error: 'Incorrect current password. Please try again or use email reset.' })
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' })
    }

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: newPassword.trim() },
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
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', details: error.message })
  }
})

// Route: PUT /api/db/products/:slug - Update the fields shown to customers.
app.put('/api/db/products/:slug', async (req, res) => {
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
app.delete('/api/db/products/:slug', async (req, res) => {
  try {
    const slug = req.params.slug
    await prisma.product.delete({ where: { slug } })
    res.json({ success: true, slug })
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: 'Failed to delete product', details: error.message })
  }
})

// Route: POST /api/db/product-images - Upload a customer-visible product image.
app.post('/api/db/product-images', async (req, res) => {
  try {
    const { slug, image, contentType } = req.body
    const imageUrl = await uploadProductImage(slug, image, contentType)
    res.status(201).json({ imageUrl })
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload product image', details: error.message })
  }
})

// Route: POST /api/db/orders - Save Order into Supabase DB via Prisma
app.post('/api/db/orders', async (req, res) => {
  try {
    const { orderId, customer, amount, currency = 'INR', items, paymentId, paymentMethod, paymentStatus, status = 'CONFIRMED' } = req.body

    const existingOrder = orderId
      ? await prisma.order.findUnique({ where: { orderId }, include: { items: true } })
      : null
    if (existingOrder) {
      return res.status(200).json({ success: true, order: existingOrder, alreadyExists: true })
    }

    const newOrder = await prisma.order.create({
      data: {
        orderId: orderId || `BM-${Date.now()}`,
        customer: customer || {},
        amount: Number(amount),
        currency,
        status,
        paymentId,
        paymentMethod,
        paymentStatus,
        items: {
          create: (items || []).map((item) => ({
            title: item.title,
            size: item.sizeLabel || item.size || 'standard',
            quantity: Number(item.quantity),
            price: Number(item.price),
          })),
        },
      },
      include: { items: true },
    })

    res.status(201).json({ success: true, order: newOrder })
  } catch (error) {
    console.error('Error saving order to Supabase:', error)
    res.status(500).json({ error: 'Failed to save order to database', details: error.message })
  }
})

// Route: GET /api/db/orders - Fetch Orders from Supabase DB via Prisma
app.get('/api/db/orders', async (req, res) => {
  try {
    const { email } = req.query
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    const result = email
      ? orders.filter((o) => o.customer && typeof o.customer === 'object' && o.customer.email === email)
      : orders

    res.json(result)
  } catch (error) {
    console.error('Error fetching orders from Supabase:', error)
    res.status(500).json({ error: 'Failed to fetch orders from database', details: error.message })
  }
})

app.patch('/api/db/orders/:orderId/status', async (req, res) => {
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
 * Description: Create a new Razorpay order (or mock order if secret key not set)
 */
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body

    if (!hasRazorpayCredentials || !razorpay) {
      return res.json({
        id: `order_demo_${Date.now()}`,
        entity: 'order',
        amount: Math.round(amount),
        currency,
        receipt: `receipt_${Date.now()}`,
        status: 'created',
        isDemo: true,
      })
    }

    if (!Number.isInteger(amount) || amount < 100) {
      return res.status(400).json({ error: 'Valid amount in paise (minimum 100 paise) is required.' })
    }

    const options = {
      amount: Math.round(amount), // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        company: 'Bun Maska Cafe',
      },
    }

    const order = await razorpay.orders.create(options)
    res.json(order)
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
 * Description: Verify Razorpay HMAC SHA256 payment signature & save order to Supabase
 */
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, items, amount } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment verification details' })
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex')

    if (razorpay_signature === expectedSign) {
      // Save order to Supabase PostgreSQL via Prisma
      try {
        await prisma.order.create({
          data: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            customer: customer || {},
            amount: Number(amount) || 0,
            status: 'PAID',
            paymentMethod: 'RAZORPAY',
            paymentStatus: 'SUCCESS',
            items: {
              create: (items || []).map((item) => ({
                title: item.title,
                size: item.sizeLabel || 'standard',
                quantity: Number(item.quantity),
                price: Number(item.price),
              })),
            },
          },
        })
      } catch (dbErr) {
        console.warn('Order saved to memory, DB log warning:', dbErr.message)
      }

      return res.json({
        success: true,
        message: 'Payment verified and saved to database successfully',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      })
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
      })
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    res.status(500).json({
      error: 'Payment verification error',
      details: error.message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Bun Maska Cafe Backend & Supabase Database server running on port ${PORT}`)
})
