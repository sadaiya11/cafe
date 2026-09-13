import crypto from 'node:crypto'
import { Resend } from 'resend'
import nodemailer from 'nodemailer'

const json = (res, status, body) => {
  res.status(status).json(body)
}

const getCredentials = () => ({
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
})

const getSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
})

async function supabaseRequest(path, options = {}) {
  const { url, key } = getSupabaseConfig()
  if (!url || !key) {
    return { status: 503, body: { error: 'Supabase is not configured on the server.' } }
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

async function getOrders(query) {
  const params = new URLSearchParams({ select: '*,order_items(*)', order: 'createdAt.desc' })
  const email = query.get('email')
  if (email) params.set('customer->>email', `eq.${email}`)

  let result = await supabaseRequest(`orders?${params.toString()}`)

  // Fallback if relationship 'order_items' is not found in schema cache
  if (result.status >= 400) {
    const fallbackParams = new URLSearchParams({ select: '*', order: 'createdAt.desc' })
    if (email) fallbackParams.set('customer->>email', `eq.${email}`)
    result = await supabaseRequest(`orders?${fallbackParams.toString()}`)
  }

  if (result.status === 200 && Array.isArray(result.body)) {
    const mapped = result.body.map(order => ({
      ...order,
      items: order.items || order.order_items || []
    }))
    return { status: 200, body: mapped }
  }

  return result
}

const serverProductCache = new Map()

async function getProducts() {
  const result = await supabaseRequest('products?select=*&order=createdAt.asc')
  let dbProducts = (result.status === 200 && Array.isArray(result.body)) ? result.body : []

  if (serverProductCache.size > 0) {
    const prodMap = new Map(dbProducts.map((p) => [p.slug, p]))
    for (const [slug, item] of serverProductCache.entries()) {
      prodMap.set(slug, { ...(prodMap.get(slug) || {}), ...item })
    }
    dbProducts = Array.from(prodMap.values())
  }

  dbProducts = dbProducts.filter((p) => p.slug && !p.slug.startsWith('_system_') && p.category !== '_system')

  return { status: 200, body: dbProducts }
}

async function saveProduct(slug, body) {
  const { title, category, tag, description, price, image, variants, inStock } = body
  const numPrice = Number(price)
  if (!slug || !title || !Number.isFinite(numPrice)) {
    return { status: 400, body: { error: 'Slug, title, and a valid price are required.' } }
  }

  const normalizedCategory = category || 'Bun Maska'
  const normalizedDesc = description !== undefined && description !== null ? String(description) : ''
  const normalizedVariants = Array.isArray(variants) && variants.length
    ? variants.map((v, i) => (i === 0 ? { ...v, price: numPrice } : v))
    : [{ size: 'standard', label: 'Standard', price: numPrice, image: image || '' }]

  const itemToSave = {
    slug,
    title,
    category: normalizedCategory,
    tag: tag || '',
    description: normalizedDesc,
    price: numPrice,
    image: image || '',
    variants: normalizedVariants,
    inStock: inStock !== false,
  }

  serverProductCache.set(slug, itemToSave)

  const result = await supabaseRequest('products?on_conflict=slug', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(itemToSave),
  })

  if (result.status >= 400) {
    console.warn('Supabase DB save notice, using server cached product:', result.body)
    return { status: 200, body: itemToSave }
  }

  return { status: result.status, body: Array.isArray(result.body) ? result.body[0] : result.body }
}

async function deleteProduct(slug) {
  if (!slug) return { status: 400, body: { error: 'Slug is required.' } }
  const result = await supabaseRequest(`products?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })
  return { status: result.status < 400 ? 200 : result.status, body: { success: true, slug } }
}

const PRODUCT_IMAGE_BUCKET = 'product-images'

async function uploadProductImage(slug, dataUrl, contentType = 'image/jpeg') {
  const { url, key } = getSupabaseConfig()
  if (!url || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { status: 503, body: { error: 'Supabase Storage is not configured on the server.' } }
  }
  if (!slug || !dataUrl || !String(dataUrl).startsWith('data:image/')) {
    return { status: 400, body: { error: 'A product slug and image file are required.' } }
  }

  const [, base64] = String(dataUrl).split(',', 2)
  const file = Buffer.from(base64 || '', 'base64')
  if (!file.length || file.length > 2 * 1024 * 1024) return { status: 400, body: { error: 'Image must be 2 MB or smaller.' } }

  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : 'jpg'
  const objectPath = `products/${slug.replace(/[^a-z0-9-]/gi, '-')}-${Date.now()}.${extension}`
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: PRODUCT_IMAGE_BUCKET, name: PRODUCT_IMAGE_BUCKET, public: true }),
  })
  const response = await fetch(`${url}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'false' },
    body: file,
  })
  if (!response.ok) return { status: response.status, body: { error: await response.text() || 'Storage upload failed.' } }
  return { status: 201, body: { imageUrl: `${url}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${objectPath}` } }
}

async function saveOrder(body) {
  const { orderId, customer, amount, currency = 'INR', items = [], paymentId, paymentMethod, paymentStatus, status = 'CONFIRMED' } = body
  if (orderId) {
    const existingResult = await supabaseRequest(`orders?orderId=eq.${encodeURIComponent(orderId)}&select=*`)
    if (existingResult.status < 400 && existingResult.body?.length) {
      return { status: 200, body: { success: true, order: existingResult.body[0], alreadyExists: true } }
    }
  }

  const orderResult = await supabaseRequest('orders?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      orderId: orderId || `BM-${Date.now()}`,
      customer: customer || {},
      amount: Number(amount),
      currency,
      paymentId,
      paymentMethod,
      paymentStatus,
      status,
    }),
  })

  if (orderResult.status >= 400) return orderResult
  const order = Array.isArray(orderResult.body) ? orderResult.body[0] : orderResult.body

  if (items.length) {
    const itemResult = await supabaseRequest('order_items', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(items.map((item) => ({
        orderId: order.id,
        title: item.title,
        size: item.sizeLabel || item.size || 'standard',
        quantity: Number(item.quantity),
        price: Number(item.price),
      }))),
    })
    if (itemResult.status >= 400) return itemResult
  }

  return { status: 201, body: { success: true, order } }
}

async function createRazorpayOrder(body) {
  const { amount, currency = 'INR' } = body
  const { keyId, keySecret } = getCredentials()

  if (!keyId || !keySecret) {
    return { status: 503, body: { error: 'Razorpay is not configured on the server.' } }
  }

  if (!Number.isInteger(amount) || amount < 100) {
    return { status: 400, body: { error: 'Valid amount in paise (minimum 100 paise) is required.' } }
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: { company: 'Bun Maska Cafe' },
    }),
  })

  const result = await response.json()
  return { status: response.status, body: result }
}

async function verifyPayment(body) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customer, items, amount } = body
  const { keySecret } = getCredentials()

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { status: 400, body: { error: 'Missing required payment verification details' } }
  }

  if (!keySecret) {
    return { status: 503, body: { error: 'Razorpay is not configured on the server.' } }
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (razorpay_signature !== expectedSignature) {
    return { status: 400, body: { success: false, error: 'Invalid payment signature' } }
  }

  const savedOrder = await saveOrder({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    customer,
    items,
    amount,
    currency: 'INR',
    status: 'PAID',
    paymentMethod: 'RAZORPAY',
    paymentStatus: 'SUCCESS',
  })

  if (savedOrder.status >= 400) {
    console.warn('Database save warning during payment verification:', savedOrder.body)
  }

  return {
    status: 200,
    body: {
      success: true,
      message: 'Payment verified successfully',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    },
  }
}

async function updateOrderStatusInDb(orderId, status) {
  const allowedStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PAID']
  if (!allowedStatuses.includes(status)) {
    return { status: 400, body: { error: 'Invalid order status.' } }
  }

  const result = await supabaseRequest(`orders?orderId=eq.${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status }),
  })

  if (result.status === 200 && Array.isArray(result.body) && result.body.length === 0) {
    return supabaseRequest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status }),
    })
  }

  return result
}

async function registerAuthUser(body) {
  const { name, email, password, role = 'CUSTOMER', adminSecretKey } = body || {}
  if (!name || !name.trim() || !email || !email.trim() || !password || !password.trim()) {
    return { status: 400, body: { error: 'Name, email, and password are required.' } }
  }
  const normalizedEmail = email.trim().toLowerCase()
  if (password.trim().length < 4) {
    return { status: 400, body: { error: 'Password must be at least 4 characters long.' } }
  }

  const isRegisteringAdmin = role.toUpperCase() === 'ADMIN'
  const expectedAdminSecret = process.env.ADMIN_SECRET_KEY || 'BUN_MASKA_ADMIN_2026'

  if (isRegisteringAdmin) {
    if (!adminSecretKey || String(adminSecretKey).trim() !== expectedAdminSecret) {
      return {
        status: 403,
        body: { error: 'Invalid Admin Security Passcode. Only authorized store managers with the Master Key can register Admin accounts.' },
      }
    }
  }

  const existing = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}&select=*`)
  if (existing.status < 400 && Array.isArray(existing.body) && existing.body.length > 0) {
    return { status: 400, body: { error: 'An account with this email already exists. Please login instead.' } }
  }

  const userRole = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CUSTOMER'
  const result = await supabaseRequest('users?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim(),
      role: userRole,
    }),
  })

  if (result.status >= 400) return result
  const user = Array.isArray(result.body) ? result.body[0] : result.body
  return {
    status: 201,
    body: {
      success: true,
      message: 'Account registered successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        zip: user.zip || '',
        role: user.role,
      },
    },
  }
}

async function loginAuthUser(body) {
  const { email, password } = body || {}
  if (!email || !email.trim() || !password || !password.trim()) {
    return { status: 400, body: { error: 'Email and password are required.' } }
  }
  const normalizedEmail = email.trim().toLowerCase()

  const result = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}&select=*`)
  if (result.status < 400 && Array.isArray(result.body) && result.body.length > 0) {
    const user = result.body[0]
    if (user.password === password.trim()) {
      return {
        status: 200,
        body: {
          success: true,
          message: 'Logged in successfully!',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            address: user.address || '',
            city: user.city || '',
            zip: user.zip || '',
            role: user.role,
          },
        },
      }
    }
  }

  return { status: 401, body: { error: 'Invalid email or password.' } }
}

async function updateUserProfile(body) {
  const { email, name, phone, address, city, zip } = body || {}
  if (!email || !email.trim()) {
    return { status: 400, body: { error: 'User email is required to update profile.' } }
  }
  const normalizedEmail = email.trim().toLowerCase()

  const updateFields = {}
  if (name !== undefined) updateFields.name = String(name).trim()
  if (phone !== undefined) updateFields.phone = String(phone).trim()
  if (address !== undefined) updateFields.address = String(address).trim()
  if (city !== undefined) updateFields.city = String(city).trim()
  if (zip !== undefined) updateFields.zip = String(zip).trim()

  const result = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(updateFields),
  })

  if (result.status >= 400) return result
  const user = Array.isArray(result.body) ? result.body[0] : result.body
  return {
    status: 200,
    body: {
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone || '',
        address: user?.address || '',
        city: user?.city || '',
        zip: user?.zip || '',
        role: user?.role,
      },
    },
  }
}

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

async function handleForgotPassword(body) {
  const { email, origin } = body || {}
  if (!email || !email.trim()) {
    return { status: 400, body: { error: 'Please provide a valid registered email address.' } }
  }
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}&select=*`)
  if (existing.status >= 400 || !Array.isArray(existing.body) || existing.body.length === 0) {
    return { status: 404, body: { error: 'No account found with this email address. Please register first.' } }
  }

  const expiresAt = Date.now() + 60 * 60 * 1000
  const tokenSecret = getResetTokenSecret()
  if (!tokenSecret) return { status: 503, body: { error: 'Password reset email service is not configured.' } }
  const token = createResetToken(normalizedEmail, expiresAt)

  const baseUrl = origin || 'http://localhost:5173'
  const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`

  const sendResult = await sendResetEmail(normalizedEmail, resetLink)
  if (!sendResult.success) {
    return { status: 503, body: { error: sendResult.error || 'Failed to send verification email. Please check server configuration.' } }
  }

  return {
    status: 200,
    body: {
      success: true,
      message: `Password reset verification link has been sent to ${normalizedEmail}! Please check your email.`,
      email: normalizedEmail,
    },
  }
}

async function handleResetPassword(body) {
  const { email, token, newPassword } = body || {}
  if (!email || !token || !newPassword || !newPassword.trim()) {
    return { status: 400, body: { error: 'Email, token, and a new password are required.' } }
  }

  if (newPassword.trim().length < 4) {
    return { status: 400, body: { error: 'New password must be at least 4 characters long.' } }
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!verifyResetToken(token, normalizedEmail)) {
    return { status: 400, body: { error: 'Password reset link is invalid or has expired. Please request a new one.' } }
  }
  const result = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ password: newPassword.trim() }),
  })

  if (result.status >= 400) return result
  return {
    status: 200,
    body: {
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    },
  }
}

async function handleChangePassword(body) {
  const { email, currentPassword, newPassword } = body || {}
  if (!email || !currentPassword || !newPassword) {
    return { status: 400, body: { error: 'Current password and new password are required.' } }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}&select=*`)

  if (existing.status >= 400 || !Array.isArray(existing.body) || existing.body.length === 0) {
    return { status: 404, body: { error: 'User account not found.' } }
  }

  const user = existing.body[0]
  if (user.password && user.password !== currentPassword.trim()) {
    return { status: 400, body: { error: 'Incorrect current password. Please try again or use email reset.' } }
  }

  if (newPassword.trim().length < 4) {
    return { status: 400, body: { error: 'New password must be at least 4 characters long.' } }
  }

  const result = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ password: newPassword.trim() }),
  })

  if (result.status >= 400) return result
  return { status: 200, body: { success: true, message: 'Password updated successfully!' } }
}

const DEFAULT_SETTINGS = {
  isStoreOpen: true,
  storeClosedNotice: 'Our cafe is currently closed for online orders. Daily operating hours: 11:00 AM - 11:30 PM.',
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

const SLIDE_IMAGE_BUCKET = 'hero-banner-slider'

async function uploadSlideImage(slideId, dataUrl, contentType = 'image/jpeg') {
  const { url, key } = getSupabaseConfig()
  if (!url || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    return { status: 503, body: { error: 'Supabase Storage is not configured on the server.' } }
  }
  if (!dataUrl || !String(dataUrl).startsWith('data:image/')) {
    return { status: 400, body: { error: 'An image file is required.' } }
  }

  const [, base64] = String(dataUrl).split(',', 2)
  const file = Buffer.from(base64 || '', 'base64')
  if (!file.length || file.length > 5 * 1024 * 1024) return { status: 400, body: { error: 'Image must be 5 MB or smaller.' } }

  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : 'jpg'
  const safeId = (slideId || 'slide').replace(/[^a-z0-9-]/gi, '-')
  const objectPath = `slides/${safeId}-${Date.now()}.${extension}`
  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: SLIDE_IMAGE_BUCKET, name: SLIDE_IMAGE_BUCKET, public: true }),
  }).catch(() => {})
  await fetch(`${url}/storage/v1/bucket/${SLIDE_IMAGE_BUCKET}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ public: true }),
  }).catch(() => {})


  const response = await fetch(`${url}/storage/v1/object/${SLIDE_IMAGE_BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: file,
  })
  if (!response.ok) return { status: response.status, body: { error: await response.text() || 'Storage upload failed.' } }
  return { status: 201, body: { imageUrl: `${url}/storage/v1/object/public/${SLIDE_IMAGE_BUCKET}/${objectPath}` } }
}

const serverSettingsCache = new Map()
const serverSlidesCache = new Map()

async function getSettings() {
  const result = await supabaseRequest('products?slug=eq._system_store_settings&select=*')
  if (result.status === 200 && Array.isArray(result.body) && result.body.length > 0) {
    const val = result.body[0].variants
    if (val && typeof val === 'object') {
      serverSettingsCache.set('settings', val)
      return { status: 200, body: val }
    }
  }
  const cached = serverSettingsCache.get('settings')
  return { status: 200, body: cached || DEFAULT_SETTINGS }
}

async function saveSettings(body) {
  if (!body || typeof body !== 'object') {
    return { status: 400, body: { error: 'Invalid settings body.' } }
  }
  serverSettingsCache.set('settings', body)
  const itemToSave = {
    id: '00000000-0000-0000-0000-000000000001',
    slug: '_system_store_settings',
    title: 'System Store Settings',
    category: '_system',
    description: 'System settings for cafe profile, contact info and rates',
    price: 0,
    image: '',
    variants: body,
    inStock: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const result = await supabaseRequest('products?on_conflict=slug', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(itemToSave),
  })
  if (result.status >= 400) {
    console.warn('Supabase DB settings save notice, using server cached settings:', result.body)
  }
  return { status: 200, body: { success: true, settings: body } }
}

async function getSlides() {
  const result = await supabaseRequest('products?slug=eq._system_hero_slides&select=*')
  if (result.status === 200 && Array.isArray(result.body) && result.body.length > 0) {
    const val = result.body[0].variants
    if (Array.isArray(val)) {
      serverSlidesCache.set('slides', val)
      return { status: 200, body: val }
    }
  }
  const cached = serverSlidesCache.get('slides')
  return { status: 200, body: cached || DEFAULT_HERO_SLIDES }
}


async function saveSlides(body) {
  if (!Array.isArray(body)) {
    return { status: 400, body: { error: 'Hero slides body must be an array.' } }
  }
  serverSlidesCache.set('slides', body)
  const itemToSave = {
    id: '00000000-0000-0000-0000-000000000002',
    slug: '_system_hero_slides',
    title: 'System Hero Slides',
    category: '_system',
    description: 'Homepage Hero Slides',
    price: 0,
    image: '',
    variants: body,
    inStock: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const result = await supabaseRequest('products?on_conflict=slug', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(itemToSave),
  })
  if (result.status >= 400) {
    console.warn('Supabase DB slides save notice, using server cached slides:', result.body)
  }
  return { status: 200, body: { success: true, slides: body } }
}

async function getAdminUsers() {
  const result = await supabaseRequest('users?select=*&order=createdAt.desc')
  if (result.status === 200 && Array.isArray(result.body)) {
    const sanitized = result.body.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      address: u.address || '',
      city: u.city || '',
      zip: u.zip || '',
      role: u.role || 'CUSTOMER',
      createdAt: u.createdAt || u.created_at,
    }))
    return { status: 200, body: sanitized }
  }
  return result
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
    const route = requestUrl.pathname
    const productSlug = route.match(/\/db\/products\/([^/]+)$/)?.[1]
    const orderStatusMatch = route.match(/\/db\/orders\/([^/]+)\/status$/)
    const orderStatusId = orderStatusMatch ? decodeURIComponent(orderStatusMatch[1]) : null

    const result = route.endsWith('/auth/register') && req.method === 'POST'
      ? await registerAuthUser(req.body || {})
      : route.endsWith('/auth/login') && req.method === 'POST'
        ? await loginAuthUser(req.body || {})
      : route.endsWith('/admin/users') && req.method === 'GET'
        ? await getAdminUsers()

        : route.endsWith('/auth/forgot-password') && req.method === 'POST'
          ? await handleForgotPassword(req.body || {})
          : route.endsWith('/auth/reset-password') && req.method === 'POST'
            ? await handleResetPassword(req.body || {})
            : route.endsWith('/auth/change-password') && (req.method === 'PUT' || req.method === 'POST')
              ? await handleChangePassword(req.body || {})
              : route.endsWith('/auth/profile') && (req.method === 'PUT' || req.method === 'PATCH')
                ? await updateUserProfile(req.body || {})
                : route.endsWith('/db/settings') && req.method === 'GET'
                  ? await getSettings()
                  : route.endsWith('/db/settings') && (req.method === 'PUT' || req.method === 'POST')
                    ? await saveSettings(req.body || {})
                    : route.endsWith('/db/slides') && req.method === 'GET'
                      ? await getSlides()
                      : route.endsWith('/db/slides') && (req.method === 'PUT' || req.method === 'POST')
                        ? await saveSlides(req.body || {})
                        : route.endsWith('/db/slide-images') && req.method === 'POST'
                          ? await uploadSlideImage(req.body?.slideId, req.body?.image, req.body?.contentType)
                          : route.endsWith('/db/products') && req.method === 'GET'
                            ? await getProducts()
                            : route.endsWith('/db/product-images') && req.method === 'POST'
                              ? await uploadProductImage(req.body?.slug, req.body?.image, req.body?.contentType)
                              : productSlug && req.method === 'PUT'
                                ? await saveProduct(decodeURIComponent(productSlug), req.body || {})
                                : productSlug && req.method === 'DELETE'
                                  ? await deleteProduct(decodeURIComponent(productSlug))
                                  : orderStatusId && (req.method === 'PATCH' || req.method === 'PUT')
                                    ? await updateOrderStatusInDb(orderStatusId, req.body?.status)
                                    : route.endsWith('/db/orders') && req.method === 'GET'
                                      ? await getOrders(requestUrl.searchParams)
                                      : route.endsWith('/db/orders') && req.method === 'POST'
                                        ? await saveOrder(req.body || {})
                                        : route.endsWith('/payments/create-order') && req.method === 'POST'
                                          ? await createRazorpayOrder(req.body || {})
                                          : route.endsWith('/payments/verify') && req.method === 'POST'
                                            ? await verifyPayment(req.body || {})
                                            : { status: 404, body: { error: 'API route not found' } }

    return json(res, result.status, result.body)
  } catch (error) {
    console.error('API request failed:', error)
    return json(res, 500, { error: 'Payment service request failed' })
  }
}
