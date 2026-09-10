const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const LOCAL_STORAGE_KEY = 'bun_maska_user_orders'
const STATUS_OVERRIDES_KEY = 'bun_maska_status_overrides'

function getStatusOverrides() {
  try {
    const data = localStorage.getItem(STATUS_OVERRIDES_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function setStatusOverride(id1, id2, newStatus) {
  try {
    const overrides = getStatusOverrides()
    if (id1) overrides[String(id1)] = newStatus
    if (id2) overrides[String(id2)] = newStatus
    localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(overrides))
  } catch (e) {
    console.warn('Failed to save status override:', e)
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

  const overrides = getStatusOverrides()
  const key1 = order.orderId ? String(order.orderId) : null
  const key2 = order.id ? String(order.id) : null
  const currentStatus = (key1 && overrides[key1]) || (key2 && overrides[key2]) || order.status || 'PENDING'

  return {
    ...order,
    status: currentStatus,
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

/**
 * Fetch all customer orders from Supabase Database API (merged with local orders)
 */
export async function fetchAdminOrders() {
  const localOrders = getLocalOrders()

  try {
    const response = await fetch(`${API_BASE_URL}/api/db/orders`)
    if (response.ok) {
      const apiOrders = await response.json()
      const apiOrderIds = new Set((apiOrders || []).map((o) => o.orderId || o.id))
      const uniqueLocal = localOrders.filter((o) => !apiOrderIds.has(o.orderId || o.id))
      return [...apiOrders, ...uniqueLocal].map(normalizeOrder)
    }
  } catch (err) {
    console.warn('Admin API fetch fallback to local storage:', err.message)
  }

  return localOrders.map(normalizeOrder)
}

/**
 * Update order status (CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
 */
export async function updateOrderStatus(primaryId, newStatus, altId = null) {
  // 1. Immediately persist status override locally under ALL keys
  setStatusOverride(primaryId, altId, newStatus)

  // 2. Also update in local orders array
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) break
    } catch (error) {
      console.warn('Order status API endpoint error:', error.message)
    }
  }

  return true
}

export default {
  fetchAdminOrders,
  updateOrderStatus,
}
