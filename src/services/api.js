const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/** Register a new user account in database */
export async function registerUser({ name, email, password, role = 'CUSTOMER', adminSecretKey }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, adminSecretKey }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed.')
  }
  return data
}

/** Authenticate user email and password against database */
export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Invalid email or password.')
  }
  return data
}

/** Update user profile (name and phone only) in database */
export async function updateUserProfile({ email, name, phone }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, phone }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update user profile.')
  }
  return data
}

/** Request password reset verification link sent to user's email */
export async function forgotPassword({ email }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, origin }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send password reset email.')
  }
  return data
}

/** Verify link token and update password */
export async function resetPassword({ email, token, newPassword }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password.')
  }
  return data
}

/** Change user password directly from profile page */
export async function changePassword({ email, currentPassword, newPassword }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, currentPassword, newPassword }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update password.')
  }
  return data
}

/** Create a new order in the database through the backend API. */
export async function createOrder(orderPayload) {
  const response = await fetch(`${API_BASE_URL}/api/db/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Unable to create order.')
  }

  return response.json()
}

export function getOrderTimestamp(order) {
  if (!order) return 0
  const rawDate = order.createdAt || order.created_at || order.orderDate || order.date
  if (rawDate) {
    const parsed = new Date(rawDate).getTime()
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  const idStr = String(order.orderId || order.id || '')
  const numMatch = idStr.match(/\d{10,}/)
  if (numMatch) {
    const parsed = Number(numMatch[0])
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return 0
}

/**
 * 2. Get User Orders from Supabase Database via API (with merged local order state)
 */
export async function getOrders(userEmail = '') {
  const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''
  let orders = []

  try {
    const response = await fetch(`${API_BASE_URL}/api/db/orders${query}`)
    if (response.ok) {
      orders = await response.json()
    }
  } catch (err) {
    console.warn('API getOrders fallback to local storage:', err.message)
  }

  let localOrders = []
  try {
    const data = localStorage.getItem('bun_maska_user_orders')
    localOrders = data ? JSON.parse(data) : []
  } catch (err) {
    console.warn('Error reading local orders:', err)
  }

  const apiOrderIds = new Set(orders.map((o) => o.orderId || o.id))
  const uniqueLocal = localOrders.filter((o) => !apiOrderIds.has(o.orderId || o.id))
  let combined = [...orders, ...uniqueLocal]

  if (userEmail) {
    combined = combined.filter((o) => {
      const cust = o.customer || {}
      return !cust.email || cust.email.toLowerCase() === userEmail.toLowerCase()
    })
  }

  let statusOverrides = {}
  try {
    const data = localStorage.getItem('bun_maska_status_overrides')
    statusOverrides = data ? JSON.parse(data) : {}
  } catch (err) {
    console.warn('Error reading status overrides:', err)
  }

  const mapped = combined.map((o) => {
    const key1 = o.orderId ? String(o.orderId) : null
    const key2 = o.id ? String(o.id) : null
    const override = (key1 && statusOverrides[key1]) || (key2 && statusOverrides[key2])
    return { ...o, status: override || o.status || 'PENDING' }
  })

  // Sort latest orders first (date and time descending)
  return mapped.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a))
}

/**
 * 3. Get Products from Supabase Database via API
 */
export async function getProducts() {
  const response = await fetch(`${API_BASE_URL}/api/db/products`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Unable to fetch products.')
  }
  return response.json()
}

/** Save a menu item so changes are shared with the customer storefront. */
export async function saveProduct(product) {
  const response = await fetch(`${API_BASE_URL}/api/db/products/${encodeURIComponent(product.slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Unable to save product.')
  }

  return response.json()
}

/** Delete a product from the database */
export async function deleteProduct(slug) {
  const response = await fetch(`${API_BASE_URL}/api/db/products/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Unable to delete product.')
  }

  return response.json()
}

/** Upload a product image and receive its permanent public URL (with data URL fallback). */
export async function uploadProductImage(slug, file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please select an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.')

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read the image.'))
    reader.readAsDataURL(file)
  })

  try {
    const response = await fetch(`${API_BASE_URL}/api/db/product-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, image: dataUrl, contentType: file.type }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data?.imageUrl) return data
    }
  } catch (e) {
    console.warn('Backend image upload endpoint notice, using local image data URL:', e.message)
  }

  // Fallback to dataUrl so uploaded image ALWAYS displays immediately!
  return { imageUrl: dataUrl }
}

export default {
  registerUser,
  loginUser,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  createOrder,
  getOrders,
  getProducts,
  saveProduct,
  deleteProduct,
  uploadProductImage,
}
