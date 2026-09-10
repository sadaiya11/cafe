export default function OrderNotificationToast({ newOrder, onClose, onViewDetails }) {
  if (!newOrder) return null

  const customerName = newOrder.customer?.name || newOrder.customer?.email || 'Valued Customer'
  const itemsCount = newOrder.items?.length || 1
  const amount = Number(newOrder.amount || 0).toFixed(2)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-4 rounded-2xl border border-orange-500/50 bg-slate-900/95 p-4 shadow-2xl shadow-orange-500/20 backdrop-blur-md animate-bounce">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white pulse-active">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
            NEW ORDER ARRIVED
          </span>
          <span className="text-xs font-semibold text-slate-400">#{newOrder.orderId || newOrder.id}</span>
        </div>
        <p className="mt-1 truncate text-sm font-bold text-white">{customerName}</p>
        <p className="text-xs text-slate-300">
          {itemsCount} {itemsCount === 1 ? 'item' : 'items'} • <strong className="text-orange-400">₹{amount}</strong>
        </p>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            onViewDetails(newOrder)
            onClose()
          }}
          className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600 shadow-md shadow-orange-500/30"
        >
          View Order
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
