import crypto from 'node:crypto'

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

async function getProducts() {
  return supabaseRequest('products?select=*&order=createdAt.asc')
}

async function saveProduct(slug, body) {
  const { title, category, tag, description, price, image, variants, inStock } = body
  if (!slug || !title || !category || !description || !Number.isFinite(Number(price))) {
    return { status: 400, body: { error: 'Slug, title, category, description, and a valid price are required.' } }
  }

  const result = await supabaseRequest('products?on_conflict=slug', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ slug, title, category, tag, description, price: Number(price), image: image || '', variants, inStock: inStock !== false }),
  })
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
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '', role: user.role },
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
          user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '', role: user.role },
        },
      }
    }
  }

  return { status: 401, body: { error: 'Invalid email or password.' } }
}

async function updateUserProfile(body) {
  const { email, name, phone } = body || {}
  if (!email || !email.trim()) {
    return { status: 400, body: { error: 'User email is required to update profile.' } }
  }
  const normalizedEmail = email.trim().toLowerCase()

  const updateFields = {}
  if (name !== undefined) updateFields.name = String(name).trim()
  if (phone !== undefined) updateFields.phone = String(phone).trim()

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
      user: { id: user?.id, name: user?.name, email: user?.email, phone: user?.phone || '', role: user?.role },
    },
  }
}

const apiResetTokens = new Map()

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

  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = Date.now() + 60 * 60 * 1000
  apiResetTokens.set(token, { email: normalizedEmail, expiresAt })

  const baseUrl = origin || 'http://localhost:5173'
  const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`

  return {
    status: 200,
    body: {
      success: true,
      message: `Password reset verification link has been sent to ${normalizedEmail}!`,
      resetLink,
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
  const result = await supabaseRequest(`users?email=eq.${encodeURIComponent(normalizedEmail)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ password: newPassword.trim() }),
  })

  if (result.status >= 400) return result
  if (apiResetTokens.has(token)) apiResetTokens.delete(token)

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
      : route.endsWith('/auth/forgot-password') && req.method === 'POST'
        ? await handleForgotPassword(req.body || {})
      : route.endsWith('/auth/reset-password') && req.method === 'POST'
        ? await handleResetPassword(req.body || {})
      : route.endsWith('/auth/change-password') && (req.method === 'PUT' || req.method === 'POST')
        ? await handleChangePassword(req.body || {})
      : route.endsWith('/auth/profile') && (req.method === 'PUT' || req.method === 'PATCH')
        ? await updateUserProfile(req.body || {})
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
