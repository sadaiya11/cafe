import { useState } from 'react'
import { useSelector } from 'react-redux'
import SEO from '../components/SEO'
import DemoPaymentModal from '../components/DemoPaymentModal'
import { useCart } from '../context/CartContext'
import { createOrder } from '../services/api'
import { validateCoupon } from '../services/couponService'

const formatPrice = (price) => `₹${Number(price || 0).toFixed(2)}`

const paymentMethods = [
  { id: 'razorpay', title: 'Pay Online (Razorpay / UPI / Card)', detail: 'Instant checkout with UPI, Credit/Debit Cards, NetBanking, or Wallet.' },
  { id: 'cod', title: 'Cash on Delivery (COD)', detail: 'Pay cash when your fresh food arrives at your door.' },
]

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'))
    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const { items, subtotal, delivery, tax, total, clearCart, storeSettings } = useCart()
  const { user } = useSelector((state) => state.auth)
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', zip: '', notes: '' })
  const [status, setStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [demoPaymentOpen, setDemoPaymentOpen] = useState(false)

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [couponNotice, setCouponNotice] = useState(null)

  const handleApplyCoupon = () => {
    const res = validateCoupon(couponCode, subtotal)
    setCouponNotice(res)
    if (res.valid) {
      setAppliedDiscount(res.discountAmount)
    } else {
      setAppliedDiscount(0)
    }
  }

  const finalPayableTotal = Math.max(0, total - appliedDiscount)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  // Create Order using API Service
  const completeOrder = async (message, orderId, payment = {}) => {
    const customer = { ...form, email: user?.email || form.email || '' }
    if (paymentMethod === 'cod' || payment.isDemo) {
      try {
        await createOrder({
          orderId: orderId || `BM-${Date.now()}`,
          customer,
          amount: finalPayableTotal,
          currency: 'INR',
          items,
          paymentId: payment.paymentId,
          paymentMethod: paymentMethod === 'cod' ? 'COD' : 'RAZORPAY',
          paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'SUCCESS',
          status: paymentMethod === 'cod' ? 'CONFIRMED' : 'PAID',
        })
      } catch (e) {
        setStatus({ type: 'failure', message: `We could not save your order: ${e.message} Please try again.` })
        return false
      }
    }

    setStatus({ type: 'success', message, orderId })
    clearCart()
    return true
  }

  const failPayment = (message) => setStatus({ type: 'failure', message })

  const startOnlinePayment = async () => {
    setProcessing(true)
    const customer = { ...form, email: user?.email || form.email || '' }
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(finalPayableTotal * 100), currency: 'INR', items, customer }),
      })
      if (!response.ok) throw new Error('Backend payment endpoint is not running on Vercel.')

      const order = await response.json()

      if (order.isDemo) {
        setDemoPaymentOpen(true)
        return
      }

      await loadRazorpayScript()

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_demo',
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Bun Maska Café',
        description: 'Artisanal Bun Maska & Chai',
        order_id: order.id,
        prefill: {
          name: form.name,
          email: user?.email || form.email,
          contact: form.phone,
        },
        theme: { color: '#f97316' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer,
                items,
                amount: finalPayableTotal,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              completeOrder('Your payment was verified successfully and your order is being prepared!', response.razorpay_order_id, { paymentId: response.razorpay_payment_id })
            } else {
              failPayment(verifyData.error || 'Payment verification failed.')
            }
          } catch (e) {
            failPayment('Payment verification error: ' + e.message)
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        failPayment(resp.error.description || 'Payment failed.')
        setProcessing(false)
      })
      rzp.open()
    } catch (err) {
      console.warn('Razorpay live endpoint unavailable, opening demo payment sheet:', err.message)
      setDemoPaymentOpen(true)
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!items.length) return
    if (storeSettings?.isStoreOpen === false) {
      setStatus({ type: 'failure', message: `Store Closed: ${storeSettings.storeClosedNotice || 'We are currently not accepting online orders.'}` })
      return
    }
    if (paymentMethod === 'cod') {
      completeOrder('Your order has been confirmed! Our delivery partner will collect cash upon delivery.')
    } else {
      startOnlinePayment()
    }
  }

  if (status?.type === 'success') {
    return (
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 text-center shadow-lg shadow-slate-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">🎉</div>
        <h1 className="mt-4 text-3xl font-black text-slate-900">Order Confirmed!</h1>
        <p className="mt-2 text-slate-600">{status.message}</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 font-mono text-sm">
          <span className="text-slate-500">Order ID: </span>
          <strong className="text-slate-900">{status.orderId || 'BM-ONLINE'}</strong>
        </div>
        <div className="mt-8 flex justify-center gap-4">
          <a href="/orders" className="rounded-full bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600">
            Track Order Status ➔
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO title="Checkout | Bun Maska Café" noindex={true} />
      <form onSubmit={handleSubmit} className="grid gap-8 pb-10 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">Secure checkout</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Complete your order</h1>
          
          {status?.type === 'failure' && (
            <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700">
              ⚠️ {status.message}
            </div>
          )}

          <div className="mt-8 space-y-8">
            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-600">Delivery details</p>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input required name="name" value={form.name} onChange={updateField} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-400" placeholder="Full name *" />
                  <input required name="phone" value={form.phone} onChange={updateField} type="tel" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-400" placeholder="Phone number *" />
                  <input required name="address" value={form.address} onChange={updateField} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-400 md:col-span-2" placeholder="Street address *" />
                  <input required name="city" value={form.city} onChange={updateField} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-400" placeholder="City *" />
                  <input required name="zip" value={form.zip} onChange={updateField} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-orange-400" placeholder="ZIP code *" />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-600">Choose payment</p>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <label key={method.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${paymentMethod === method.id ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
                    <input type="radio" name="paymentMethod" value={method.id} checked={paymentMethod === method.id} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1" />
                    <span>
                      <strong className="block text-slate-900 text-sm font-bold">{method.title}</strong>
                      <small className="text-slate-600 text-xs">{method.detail}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <textarea name="notes" value={form.notes} onChange={updateField} rows="3" placeholder="Any instructions for the kitchen or delivery?" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-400" />
          </div>
        </section>

        {/* Order Summary & Coupon Card */}
        <aside className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl shadow-slate-300 md:p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black">Order summary</h2>
            <div className="mt-6 space-y-3">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 text-sm text-slate-300">
                  <span>{item.title} {item.sizeLabel ? `(${item.sizeLabel})` : ''} x{item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* PROMO CODE / COUPON BOX */}
            <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Have a Coupon Code?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. BUN20, FIRST50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-amber-400 font-bold uppercase tracking-wider focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md"
                >
                  Apply
                </button>
              </div>

              {couponNotice && (
                <p className={`text-xs font-medium ${couponNotice.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {couponNotice.message}
                </p>
              )}

              {/* Sample coupons tip */}
              <div className="text-[10px] text-slate-500 pt-1">
                Try: <button type="button" onClick={() => { setCouponCode('BUN20'); setCouponNotice(null); }} className="text-amber-400 underline font-bold">BUN20</button> (20% OFF) or <button type="button" onClick={() => { setCouponCode('FIRST50'); setCouponNotice(null); }} className="text-amber-400 underline font-bold">FIRST50</button> (Flat ₹50 OFF)
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-6 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(appliedDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between"><span>Delivery</span><span>{formatPrice(delivery)}</span></div>
              <div className="flex justify-between"><span>Tax (GST)</span><span>{formatPrice(tax)}</span></div>
            </div>

            <div className="mt-4 flex items-center justify-between border-y border-slate-700 py-4">
              <span className="text-lg font-bold">Total Payable</span>
              <span className="text-2xl font-black text-orange-300">{formatPrice(finalPayableTotal)}</span>
            </div>
          </div>

          <div>
            <button disabled={processing || !items.length} type="submit" className="mt-6 w-full rounded-full bg-orange-500 px-6 py-4 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60 shadow-lg shadow-orange-500/20">
              {processing ? 'Connecting...' : paymentMethod === 'cod' ? 'Confirm cash order' : `Pay ${formatPrice(finalPayableTotal)} securely`}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              {paymentMethod === 'cod' ? 'Payment is collected at delivery.' : 'Online payments are handled securely by Razorpay.'}
            </p>
          </div>
        </aside>
      </form>

      {demoPaymentOpen ? (
        <DemoPaymentModal 
          amount={finalPayableTotal} 
          onClose={() => setDemoPaymentOpen(false)} 
          onSuccess={(orderId) => { setDemoPaymentOpen(false); completeOrder('Your online payment was successful!', orderId, { isDemo: true, paymentId: orderId }) }} 
          onFailure={(message) => { setDemoPaymentOpen(false); failPayment(message) }} 
        />
      ) : null}
    </>
  )
}
