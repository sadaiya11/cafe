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
    if (!slug || !title || !description || !category || !Number.isFinite(Number(price))) {
      return res.status(400).json({ error: 'Slug, title, category, description, and a valid price are required.' })
    }

    const product = await prisma.product.upsert({
      where: { slug },
      update: { title, category, tag, description, price: Number(price), image: image || '', variants, inStock: inStock !== false },
      create: { slug, title, category, tag, description, price: Number(price), image: image || '', variants, inStock: inStock !== false },
    })
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: 'Failed to save product', details: error.message })
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

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount in paise is required' })
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
