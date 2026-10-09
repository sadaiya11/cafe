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
  try {
    const rawRes = await fetch(`${API_BASE_URL}/api/db/orders?admin=true`, { headers: authHeaders() })
    const response = handleStaffResponse(rawRes)
    if (response.ok) {
      const apiOrders = await response.json()
      return (apiOrders || []).map(normalizeOrder).sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a))
    }
    return []
  } catch (err) {
    console.warn('Admin API fetch failed:', err.message)
    return []
  }
}

/**
 * Update order status (CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
 */
export async function updateOrderStatus(primaryId, newStatus, altId = null) {
  const idsToTry = [primaryId, altId].filter(Boolean)
  for (const id of idsToTry) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/db/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) return true
    } catch (error) {
      console.warn('Order status API endpoint error:', error.message)
    }
  }

  return false
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
    if (response.ok) {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      return await response.json()
    }
    const err = await response.json().catch(() => ({}))
    return { success: false, error: err.error || 'Failed to clear orders.' }
  } catch {
    return { success: false, error: 'Unable to reach the server. Database orders were not cleared.' }
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

