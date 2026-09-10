import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import SEO from '../components/SEO'
import { getOrders } from '../services/api'
import { useCart } from '../context/CartContext'

const formatPrice = (price) => `₹${Number(price || 0).toFixed(2)}`

const orderSteps = [
  { statusKey: 'CONFIRMED', label: 'Order Placed', icon: '📝' },
  { statusKey: 'PREPARING', label: 'Kitchen Preparing', icon: '👨‍🍳' },
  { statusKey: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🛵' },
  { statusKey: 'DELIVERED', label: 'Delivered', icon: '🎉' }
];

export default function OrdersPage() {
  const { user } = useSelector((state) => state.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { addItem } = useCart()

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true)
      setError(null)

      try {
        const data = await getOrders(user?.email || '')
        setOrders(data)
      } catch (err) {
        console.warn('Using fallback orders due to network/server:', err.message)
        setError(err.message)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()

    // Refresh every 1 minute (60,000 ms) for status updates
    const interval = setInterval(fetchOrders, 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const handleReorder = (order) => {
    const itemsList = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : []
    if (!itemsList.length) return

    itemsList.forEach((item) => {
      const productObj = {
        id: item.id || item.slug || item.title,
        slug: item.slug || item.title?.toLowerCase().replace(/\s+/g, '-'),
        title: item.title || item.name || 'Food Item',
        price: Number(item.price || 0),
        image: item.image || '',
      }
      const variantStr = item.sizeLabel || item.size || 'standard'
      const qty = Number(item.quantity) || 1
      addItem(productObj, variantStr, qty)
    })

    navigate('/cart')
  }

  const getStepProgress = (currentStatus) => {
    const norm = String(currentStatus || 'CONFIRMED').toUpperCase()
    if (norm === 'CANCELLED') return -1
    if (norm === 'DELIVERED' || norm === 'PAID') return 4
    if (norm === 'OUT_FOR_DELIVERY') return 3
    if (norm === 'PREPARING') return 2
    return 1 // CONFIRMED or PENDING
  }

  const renderStatusBadge = (status) => {
    const norm = String(status || 'PENDING').toUpperCase()
    if (norm === 'CANCELLED') {
      return <span className="rounded-full px-3 py-0.5 text-xs font-extrabold bg-rose-100 text-rose-800">❌ CANCELLED</span>
    }
    if (norm === 'DELIVERED' || norm === 'PAID') {
      return <span className="rounded-full px-3 py-0.5 text-xs font-extrabold bg-emerald-100 text-emerald-800">🎉 DELIVERED</span>
    }
    if (norm === 'OUT_FOR_DELIVERY') {
      return <span className="rounded-full px-3 py-0.5 text-xs font-extrabold bg-purple-100 text-purple-800 animate-pulse">🛵 OUT FOR DELIVERY</span>
    }
    if (norm === 'PREPARING') {
      return <span className="rounded-full px-3 py-0.5 text-xs font-extrabold bg-blue-100 text-blue-800 animate-pulse">👨‍🍳 PREPARING</span>
    }
    if (norm === 'CONFIRMED') {
      return <span className="rounded-full px-3 py-0.5 text-xs font-extrabold bg-indigo-100 text-indigo-800">📝 CONFIRMED</span>
    }
    return <span className="rounded-full px-3 py-0.5 text-xs font-extrabold bg-amber-100 text-amber-800 animate-pulse">⏳ PENDING APPROVAL</span>
  }

  return (
    <div className="space-y-8">
      <SEO title="My Orders | Bun Maska Café" noindex={true} />
      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
        <SectionHeader
          eyebrow="My Account"
          title="Live Orders & Tracking"
          subtitle="Track your live food order status in real-time from our kitchen."
        />

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-semibold">
            Loading your orders from database...
          </div>
        ) : !orders.length ? (
          <div className="py-12 text-center">
            {error ? <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p> : null}
            <p className="text-xl font-bold text-slate-800">No orders found</p>
            <p className="mt-2 text-sm text-slate-500">Order something fresh from our menu!</p>
            <Link to="/product" className="mt-5 inline-block rounded-full bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {orders.map((order) => {
              const displayId = order.orderId || order.id || 'BM-Order'
              const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'Just now'

              const itemsSummary = Array.isArray(order.items)
                ? order.items.map((i) => `${i.quantity}x ${i.title || i.name}`).join(', ')
                : 'Food order'

              const currentStepIndex = getStepProgress(order.status)
              const isCancelled = currentStepIndex === -1

              return (
                <div
                  key={order.id || displayId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-orange-300 space-y-4 shadow-sm"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">#{displayId}</span>
                        {renderStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-slate-400">Ordered on {formattedDate}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xl font-black text-orange-600">
                        {formatPrice(order.amount || order.totalAmount || order.total)}
                      </span>
                      <button
                        onClick={() => handleReorder(order)}
                        className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black px-4 py-2 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        title="Add items back to cart"
                      >
                        <span>🔄</span>
                        <span>Reorder</span>
                      </button>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs font-medium text-slate-700">
                    🍱 {itemsSummary}
                  </div>

                  {/* LIVE TRACKER PROGRESS TIMELINE */}
                  {!isCancelled ? (
                    <div className="pt-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Live Kitchen Tracking</span>
                        <span className="text-orange-500 font-extrabold animate-pulse">● Auto-updates every 1 min</span>
                      </div>

                      {/* Progress Line & Steps */}
                      <div className="grid grid-cols-4 gap-2 relative">
                        {orderSteps.map((step, idx) => {
                          const stepNum = idx + 1
                          const isDone = currentStepIndex >= stepNum
                          const isCurrent = currentStepIndex === stepNum

                          return (
                            <div key={step.statusKey} className="flex flex-col items-center text-center space-y-1.5 z-10">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-md ${
                                isDone 
                                  ? 'bg-orange-500 text-white ring-4 ring-orange-100' 
                                  : 'bg-slate-200 text-slate-400'
                              }`}>
                                {step.icon}
                              </div>
                              <span className={`text-[11px] font-bold ${isCurrent ? 'text-orange-600' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                                {step.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">
                      ❌ This order was cancelled.
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
