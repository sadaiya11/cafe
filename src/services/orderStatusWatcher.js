import { getOrders } from './api'
import {
  notifyOrderAccepted,
  notifyOrderPreparing,
  notifyOrderReady,
  notifyOutForDelivery,
  notifyDelivered,
  notifyOrderCancelled,
  notifyPaymentSuccess,
  notifyPaymentFailed,
} from './customerNotificationService'

const SEEN_STATUS_KEY = 'bun_seen_order_statuses'

function getSeenStatuses() {
  try {
    const raw = sessionStorage.getItem(SEEN_STATUS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveSeenStatuses(map) {
  try {
    sessionStorage.setItem(SEEN_STATUS_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn('Failed to save seen statuses:', e)
  }
}

export function startOrderStatusWatcher(userEmail = '', intervalMs = 8000) {
  let timerId = null

  const checkStatusChanges = async () => {
    try {
      const orders = await getOrders(userEmail)
      if (!Array.isArray(orders)) return

      const seenMap = getSeenStatuses()
      let updatedMap = { ...seenMap }

      for (const order of orders) {
        const id = String(order.orderId || order.id || '')
        if (!id) continue

        const newStatus = String(order.status || 'PENDING').toUpperCase()
        const newPaymentStatus = String(order.paymentStatus || '').toUpperCase()
        const oldStatus = seenMap[id]

        if (oldStatus !== undefined && oldStatus !== newStatus) {
          // Trigger corresponding notification on status transition!
          if (newStatus === 'CONFIRMED') {
            notifyOrderAccepted(id)
          } else if (newStatus === 'PREPARING') {
            notifyOrderPreparing(id)
          } else if (newStatus === 'READY' || newStatus === 'READY_FOR_PICKUP') {
            notifyOrderReady(id)
          } else if (newStatus === 'OUT_FOR_DELIVERY') {
            notifyOutForDelivery(id)
          } else if (newStatus === 'DELIVERED') {
            notifyDelivered(id)
          } else if (newStatus === 'CANCELLED') {
            notifyOrderCancelled(id)
          }
        }

        const oldPaymentStatus = seenMap[`${id}_pay`]
        if (oldPaymentStatus !== undefined && oldPaymentStatus !== newPaymentStatus) {
          if (newPaymentStatus === 'SUCCESS' || newStatus === 'PAID') {
            notifyPaymentSuccess(id, order.amount || order.total)
          } else if (newPaymentStatus === 'FAILED') {
            notifyPaymentFailed(id)
          }
        }

        updatedMap[id] = newStatus
        updatedMap[`${id}_pay`] = newPaymentStatus
      }

      saveSeenStatuses(updatedMap)
    } catch (e) {
      console.warn('Order status watcher error:', e.message)
    }
  }

  // Manual status check on demand without automatic background interval loops
  return () => {}
}
