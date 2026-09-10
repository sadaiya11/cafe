export default function OrderDetailModal({ order, onClose, onUpdateStatus }) {
  if (!order) return null

  const customer = order.customer || {}
  const items = order.items || []
  const orderId = order.orderId || order.id || 'N/A'
  const isPaid = order.status === 'PAID' || order.status === 'CONFIRMED' || order.status === 'DELIVERED'
  const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Date unavailable'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl md:p-8 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white">Order #{orderId}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                {order.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Placed on {formattedDate}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-800/80 text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">

          {/* 💳 Payment Details */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
              💳 Payment Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Payment Status:</span>
                <span className="font-bold text-white">{order.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-slate-200">
                  {order.paymentId ? 'Online (Razorpay)' : customer.notes?.includes('COD') ? 'Cash on Delivery' : 'Online / COD'}
                </span>
              </div>
              {order.paymentId && (
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Payment ID:</span>
                  <span className="font-mono text-xs font-semibold text-emerald-400">{order.paymentId}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Total Amount Paid:</span>
                <span className="text-lg font-black text-orange-400">₹{Number(order.amount ?? order.totalAmount ?? order.total ?? 0).toFixed(2)} {order.currency || 'INR'}</span>
              </div>
            </div>
          </div>

          {/* 📍 Customer & Delivery Location */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
              📍 Customer & Delivery Address
            </h3>
            <div className="space-y-1.5 text-sm">
              <p className="font-bold text-white text-base">{customer.name || 'Anonymous Customer'}</p>
              {customer.phone && <p className="text-xs text-slate-300">📞 Phone: <a href={`tel:${customer.phone}`} className="text-orange-400 underline">{customer.phone}</a></p>}
              {customer.email && <p className="text-xs text-slate-400">✉️ Email: {customer.email}</p>}
              
              <div className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-300">
                <strong className="text-slate-200 block mb-1">Delivery Address:</strong>
                <p>{customer.address || 'Address not provided'}</p>
                {customer.city && <p>{customer.city} {customer.zip ? `- ${customer.zip}` : ''}</p>}
              </div>

              {customer.notes && (
                <div className="mt-2 rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5 text-xs text-orange-300">
                  <strong>Notes / Location Pin:</strong> {customer.notes}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 🍔 Ordered Items Table */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Ordered Items ({items.length})
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-800/50 text-xs font-bold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-white">{item.title || item.name || 'Item'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.size || item.sizeLabel || 'Standard'}</td>
                    <td className="px-4 py-3 text-center font-bold text-orange-400">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Update Status:</span>
            {['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  onUpdateStatus(order, st)
                  onClose()
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  order.status === st
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'border border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
