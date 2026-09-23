import { handleStaffResponse } from '../../services/staffAuthService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const LOCAL_STORAGE_KEY = 'bun_maska_user_orders'

function authHeaders() {
  try {
    const session = JSON.parse(localStorage.getItem('bun_maska_staff_session') || 'null')
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
  } catch {
    return {}
  }
}

function normalizeOrder(order) {
  let customer = order.customer || {}
  if (typeof customer === 'string') {
    try { customer = JSON.parse(customer) } catch { customer = {} }
  }
  const items = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : []
  const amount = Number(order.amount ?? order.totalAmount ?? order.total ?? 0)
  const isOnlinePayment = Boolean(order.paymentId || order.razorpayPaymentId || order.status === 'PAID')

  return {
    ...order,
    status: order.status || 'PENDING',
    customer,
    items,
    // The database stores delivery details inside `customer`, while older local
    // orders used top-level fields. Provide one consistent shape to the desk.
    customerName: order.customerName || order.customer_name || customer.name || 'Guest Customer',
    phone: order.phone || customer.phone || '',
    address: order.address || customer.address || '',
    city: order.city || customer.city || '',
    totalAmount: amount,
    total: amount,
    paymentMethod: order.paymentMethod || order.payment_method || (isOnlinePayment ? 'RAZORPAY' : 'COD'),
    paymentStatus: order.paymentStatus || order.payment_status || (isOnlinePayment ? 'SUCCESS' : 'PENDING'),
  }
}

function getLocalOrders() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function getOrderTimestamp(order) {
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
 * Fetch all customer orders from Supabase Database API (merged with local orders)
 */
export async function fetchAdminOrders() {
  const localOrders = getLocalOrders()
  let combined = []

  try {
    const rawRes = await fetch(`${API_BASE_URL}/api/db/orders`, { headers: authHeaders() })
    const response = handleStaffResponse(rawRes)
    if (response.ok) {
      const apiOrders = await response.json()
      const apiOrderIds = new Set((apiOrders || []).map((o) => o.orderId || o.id))
      const uniqueLocal = localOrders.filter((o) => !apiOrderIds.has(o.orderId || o.id))
      combined = [...apiOrders, ...uniqueLocal].map(normalizeOrder)
    } else {
      combined = localOrders.map(normalizeOrder)
    }
  } catch (err) {
    console.warn('Admin API fetch fallback to local storage:', err.message)
    combined = localOrders.map(normalizeOrder)
  }

  // Sort latest orders first (date and time descending)
  return combined.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a))
}

/**
 * Update order status (CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
 */
export async function updateOrderStatus(primaryId, newStatus, altId = null) {
  // 1. Update in local orders array for immediate optimistic UI update
  try {
    const localOrders = getLocalOrders()
    const updated = localOrders.map((o) => {
      const match1 = primaryId && (o.orderId === primaryId || o.id === primaryId || String(o.id) === String(primaryId) || String(o.orderId) === String(primaryId))
      const match2 = altId && (o.orderId === altId || o.id === altId || String(o.id) === String(altId) || String(o.orderId) === String(altId))
      if (match1 || match2) {
        return { ...o, status: newStatus }
      }
      return o
    })
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Local order status update error:', e)
  }

  // 3. Sync status update with database backend API
  const idsToTry = [primaryId, altId].filter(Boolean)
  for (const id of idsToTry) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/db/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) break
    } catch (error) {
      console.warn('Order status API endpoint error:', error.message)
    }
  }

  return true
}

export async function fetchAdminUsers() {
  try {
    const rawRes = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: authHeaders() })
    const response = handleStaffResponse(rawRes)
    if (response.ok) {
      return await response.json()
    }
  } catch (err) {
    console.warn('Failed to fetch admin users from API:', err.message)
  }
  return []
}

export async function updateUserLoginPermission(userId, isAllowedLogin) {
  try {
    const rawRes = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ isAllowedLogin }),
    })
    const response = handleStaffResponse(rawRes)
    if (response.ok) {
      return await response.json()
    }
    const err = await response.json().catch(() => ({}))
    return { success: false, error: err.error || 'Failed to update user login permission.' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function deleteAdminUser(userId) {
  try {
    const rawRes = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const response = handleStaffResponse(rawRes)
    if (response.ok) {
      return await response.json()
    }
    const err = await response.json().catch(() => ({}))
    return { success: false, error: err.error || 'Failed to delete user.' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function registerStaffMember(staffData) {
  try {
    const rawRes = await fetch(`${API_BASE_URL}/api/admin/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(staffData),
    })
    const response = handleStaffResponse(rawRes)
    if (response.ok) {
      return await response.json()
    }
    const err = await response.json().catch(() => ({}))
    return { success: false, error: err.error || 'Failed to register staff member.' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function clearAllAdminOrders() {
  try {
    const rawRes = await fetch(`${API_BASE_URL}/api/db/orders`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    })
    const response = handleStaffResponse(rawRes)
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    if (response.ok) {
      return await response.json()
    }
    const err = await response.json().catch(() => ({}))
    return { success: false, error: err.error || 'Failed to clear orders.' }
  } catch (err) {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    return { success: true, message: 'All local dummy test orders cleared.' }
  }
}

export default {
  fetchAdminOrders,
  fetchAdminUsers,
  updateOrderStatus,
  updateUserLoginPermission,
  deleteAdminUser,
  registerStaffMember,
  clearAllAdminOrders,
}

