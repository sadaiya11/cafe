/**
 * Customer Notifications Service for Bun Maska Cafe
 * Supports HTML5 Browser Notifications, Audio Chimes, and In-App Toasts & History.
 * 
 * Requirement 3.5: CUSTOMER NOTIFICATIONS
 * Send notifications for:
 * 1. Order confirmation (ORDER_CONFIRMED)
 * 2. Payment success (PAYMENT_SUCCESS)
 * 3. Payment failure (PAYMENT_FAILED)
 * 4. Order accepted (ORDER_ACCEPTED)
 * 5. Order preparing (ORDER_PREPARING)
 * 6. Order ready (ORDER_READY)
 * 7. Out for delivery (OUT_FOR_DELIVERY)
 * 8. Delivered (DELIVERED)
 * 9. Cancellation (CANCELLED)
 */

const NOTIFICATIONS_STORAGE_KEY = 'bun_customer_notifications_history'
const NOTIFICATION_SETTING_KEY = 'bun_browser_notifications_enabled'

export function isBrowserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') {
    localStorage.setItem(NOTIFICATION_SETTING_KEY, 'true')
    return 'granted'
  }
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_SETTING_KEY, 'true')
    } else {
      localStorage.setItem(NOTIFICATION_SETTING_KEY, 'false')
    }
    return permission
  } catch (e) {
    console.warn('Notification permission request error:', e)
    return 'default'
  }
}

export function playNotificationSound(type = 'info') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    if (type === 'success' || type === 'DELIVERED' || type === 'PAYMENT_SUCCESS') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1) // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2) // G5
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
      osc.start(now)
      osc.stop(now + 0.55)
    } else if (type === 'error' || type === 'CANCELLED' || type === 'PAYMENT_FAILED') {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.setValueAtTime(220, now + 0.15)
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      osc.start(now)
      osc.stop(now + 0.45)
    } else {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.setValueAtTime(880, now + 0.12) // A5
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc.start(now)
      osc.stop(now + 0.4)
    }
  } catch {
    // Audio Context not allowed prior to user interaction
  }
}

export function getCustomerNotificationsHistory() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomerNotificationToHistory(notification) {
  try {
    const existing = getCustomerNotificationsHistory()
    const updated = [notification, ...existing].slice(0, 50)
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('bun_customer_notifications_updated'))
  } catch (e) {
    console.warn('Failed to save customer notification history:', e)
  }
}

export function markAllNotificationsAsRead() {
  try {
    const existing = getCustomerNotificationsHistory()
    const updated = existing.map((n) => ({ ...n, read: true }))
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('bun_customer_notifications_updated'))
  } catch (e) {
    console.warn('Failed to mark notifications read:', e)
  }
}

export function sendCustomerNotification({ title, body, icon = '🔔', type = 'info', orderId = null, url = '/orders' }) {
  const notificationObj = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    body,
    icon,
    type,
    orderId,
    url,
    timestamp: Date.now(),
    read: false,
  }

  // 1. Play sound chime
  playNotificationSound(type)

  // 2. Save to history & dispatch in-app event
  saveCustomerNotificationToHistory(notificationObj)
  window.dispatchEvent(new CustomEvent('bun_customer_notification_toast', { detail: notificationObj }))

  // 3. HTML5 Web Browser Notification
  if (isBrowserNotificationSupported() && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: orderId ? `order-${orderId}` : `notif-${Date.now()}`,
      })
      n.onclick = () => {
        window.focus()
        if (url) window.location.href = url
      }
    } catch (e) {
      console.warn('Browser notification launch error:', e)
    }
  }
  return notificationObj
}

// ----------------------------------------------------
// 9 REQUIRED SPECIFIC NOTIFICATION TRIGGERS (Rule 3.5)
// ----------------------------------------------------

/** 1. Order confirmation */
export function notifyOrderConfirmed(orderId, amount) {
  return sendCustomerNotification({
    title: '📝 Order Confirmed!',
    body: `Your food order #${orderId} ${amount ? `(₹${amount})` : ''} has been placed successfully!`,
    icon: '📝',
    type: 'info',
    orderId,
    url: '/orders',
  })
}

/** 2. Payment success */
export function notifyPaymentSuccess(orderId, amount) {
  return sendCustomerNotification({
    title: '💳 Payment Successful!',
    body: `Payment of ₹${amount || ''} for order #${orderId} was verified & received successfully!`,
    icon: '💳',
    type: 'success',
    orderId,
    url: '/orders',
  })
}

/** 3. Payment failure */
export function notifyPaymentFailed(orderId, reason) {
  return sendCustomerNotification({
    title: '⚠️ Payment Failed',
    body: `Payment for order #${orderId} failed or was declined. ${reason || 'Please retry payment.'}`,
    icon: '⚠️',
    type: 'error',
    orderId,
    url: '/checkout',
  })
}

/** 4. Order accepted */
export function notifyOrderAccepted(orderId) {
  return sendCustomerNotification({
    title: '👍 Order Accepted!',
    body: `Bun Maska Café has accepted order #${orderId} and queued it for kitchen preparation.`,
    icon: '👍',
    type: 'info',
    orderId,
    url: '/orders',
  })
}

/** 5. Order preparing */
export function notifyOrderPreparing(orderId) {
  return sendCustomerNotification({
    title: '👨‍🍳 Kitchen Preparing Food!',
    body: `Our chefs are sizzling your fresh Bun Maska & Chai for order #${orderId}! (~15-20 mins)`,
    icon: '👨‍🍳',
    type: 'info',
    orderId,
    url: '/orders',
  })
}

/** 6. Order ready */
export function notifyOrderReady(orderId) {
  return sendCustomerNotification({
    title: '🍱 Order Ready!',
    body: `Order #${orderId} is fresh, hot, and packed ready for pickup / delivery dispatch!`,
    icon: '🍱',
    type: 'success',
    orderId,
    url: '/orders',
  })
}

/** 7. Out for delivery */
export function notifyOutForDelivery(orderId) {
  return sendCustomerNotification({
    title: '🛵 Out for Delivery!',
    body: `Our delivery partner is on the way with your order #${orderId}! (~5-10 mins away)`,
    icon: '🛵',
    type: 'info',
    orderId,
    url: '/orders',
  })
}

/** 8. Delivered */
export function notifyDelivered(orderId) {
  return sendCustomerNotification({
    title: '🎉 Order Delivered!',
    body: `Order #${orderId} has been delivered! Enjoy your hot Bun Maska & Chai.`,
    icon: '🎉',
    type: 'success',
    orderId,
    url: '/orders',
  })
}

/** 9. Cancellation */
export function notifyOrderCancelled(orderId, reason) {
  return sendCustomerNotification({
    title: '❌ Order Cancelled',
    body: `Order #${orderId} was cancelled. ${reason || 'Contact cafe support at 8085700750 if needed.'}`,
    icon: '❌',
    type: 'error',
    orderId,
    url: '/orders',
  })
}
