import { useEffect, useState } from 'react'
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  isBrowserNotificationSupported,
} from '../services/customerNotificationService'

export default function CustomerNotificationToast() {
  const [toast, setToast] = useState(null)
  const [permission, setPermission] = useState(getBrowserNotificationPermission)
  const [showPromptBanner, setShowPromptBanner] = useState(false)

  useEffect(() => {
    // Check if permission prompt banner should be shown
    if (isBrowserNotificationSupported() && permission === 'default') {
      const dismissed = sessionStorage.getItem('bun_notif_banner_dismissed')
      if (!dismissed) setShowPromptBanner(true)
    }

    const handleToastEvent = (e) => {
      if (e.detail) {
        setToast(e.detail)
      }
    }

    window.addEventListener('bun_customer_notification_toast', handleToastEvent)
    return () => window.removeEventListener('bun_customer_notification_toast', handleToastEvent)
  }, [permission])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleEnableNotifications = async () => {
    const res = await requestBrowserNotificationPermission()
    setPermission(res)
    setShowPromptBanner(false)
  }

  const handleDismissBanner = () => {
    setShowPromptBanner(false)
    sessionStorage.setItem('bun_notif_banner_dismissed', 'true')
  }

  return (
    <div className="fixed top-20 right-4 z-[9999] max-w-sm w-full space-y-3 pointer-events-none px-2 sm:px-0">
      
      {/* Browser Notification Permission Banner Prompt */}
      {showPromptBanner ? (
        <div className="pointer-events-auto bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-500/40 text-white rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔔</span>
              <div>
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Enable Order Push Notifications</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Get real-time browser alerts when your Bun Maska & Chai order status changes (Preparing, Out for Delivery, Delivered)!
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissBanner}
              className="text-slate-400 hover:text-white text-xs p-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleDismissBanner}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Not Now
            </button>
            <button
              onClick={handleEnableNotifications}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20"
            >
              🔔 Allow Browser Notifications
            </button>
          </div>
        </div>
      ) : null}

      {/* Live Customer Order Notification Toast Card */}
      {toast ? (
        <div className="pointer-events-auto bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl border-l-4 border-l-orange-500 animate-in fade-in slide-in-from-right-8 duration-300 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xl text-orange-600">
                {toast.icon || '🔔'}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">{toast.title}</h4>
                <p className="text-xs text-slate-600 leading-snug mt-0.5">{toast.body}</p>
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 text-xs p-1"
              title="Close notification"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
            <span>Bun Maska Café Alert</span>
            <span>Just now</span>
          </div>
        </div>
      ) : null}

    </div>
  )
}
