import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart'
import SEO from '../components/SEO'

const formatPrice = (price) => `₹${price.toFixed(2)}`

export default function CartPage() {
  const { items, subtotal, delivery, tax, taxRate, isFreeDelivery, freeDeliveryThreshold, total, itemCount, updateQuantity, removeItem, storeSettings } = useCart()

  const isStoreOpen = storeSettings?.isStoreOpen !== false
  const remainingForFreeDelivery = freeDeliveryThreshold ? Math.max(0, freeDeliveryThreshold - subtotal) : 0

  return (
    <div className="grid gap-8 pb-10 xl:grid-cols-[1.5fr_0.8fr]">
      <SEO title="Shopping Cart | Bun Maska Café" noindex={true} />
      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-black text-slate-900">Your cart</h1>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>
        {items.length === 0 ? (
          <div className="py-16 text-center"><p className="text-xl font-bold text-slate-900">Your cart is empty</p><p className="mt-2 text-slate-600">Choose something fresh from the products.</p><Link to="/product" className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600">Browse products</Link></div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Free Delivery Bar */}
            {freeDeliveryThreshold > 0 && (
              <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-900 flex items-center justify-between">
                {isFreeDelivery ? (
                  <span>🎉 Congratulations! You qualify for FREE Delivery!</span>
                ) : (
                  <span>🚚 Add {formatPrice(remainingForFreeDelivery)} more for FREE Delivery!</span>
                )}
              </div>
            )}

            {items.map((item) => (
              <div key={item.key} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center">
                <img src={item.image} alt={item.title} className="h-28 w-full rounded-2xl object-cover md:w-28" />
                <div className="flex-1"><Link to={`/product/${item.slug}`} className="text-xl font-bold text-slate-900 hover:text-orange-600">{item.title}</Link><p className="mt-1 text-sm text-slate-600">{item.sizeLabel} size</p><button type="button" onClick={() => removeItem(item.key)} className="mt-3 text-sm font-bold text-red-500 hover:text-red-700">Remove</button></div>
                <div className="flex items-center justify-between gap-4 md:justify-end"><div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white"><button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} className="flex h-10 w-10 items-center justify-center text-xl text-slate-700 hover:bg-slate-100" aria-label={`Decrease ${item.title} quantity`}>-</button><span className="min-w-10 text-center text-sm font-bold text-slate-900">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} className="flex h-10 w-10 items-center justify-center text-xl text-slate-700 hover:bg-slate-100" aria-label={`Increase ${item.title} quantity`}>+</button></div><p className="text-lg font-black text-orange-600">{formatPrice(item.price * item.quantity)}</p></div>
              </div>
            ))}
          </div>
        )}
      </section>
      <aside className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl shadow-slate-300 md:p-8">
        <h2 className="text-2xl font-black">Order summary</h2>
        <div className="mt-6 space-y-4 text-sm text-slate-300">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{isFreeDelivery ? <strong className="text-emerald-400">FREE</strong> : formatPrice(delivery)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST / Tax ({Math.round((taxRate || 0.08) * 100)}%)</span>
            <span>{formatPrice(tax)}</span>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between border-y border-slate-700 py-4">
          <span className="text-lg font-bold">Total</span>
          <span className="text-2xl font-black text-orange-300">{formatPrice(total)}</span>
        </div>

        {!isStoreOpen ? (
          <div className="mt-6 rounded-2xl bg-rose-500/20 border border-rose-500/30 p-4 text-center text-xs font-bold text-rose-300">
            🛑 Store Closed: {storeSettings.storeClosedNotice || 'Not accepting online orders right now.'}
          </div>
        ) : (
          <Link
            to={items.length ? '/checkout' : '/product'}
            className={`mt-8 block w-full rounded-full px-6 py-4 text-center text-base font-bold transition ${items.length ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {items.length ? 'Proceed to checkout' : 'Browse products'}
          </Link>
        )}
      </aside>
    </div>
  )
}
