import { Link } from 'react-router-dom'

export default function PaymentResult({ status, orderId, message, onRetry }) {
  const successful = status === 'success'

  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 text-center shadow-xl shadow-slate-200 md:p-12">
      <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl ${successful ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
        {successful ? '✓' : '!'}
      </div>
      <p className={`mt-7 text-xs font-bold uppercase tracking-[0.3em] ${successful ? 'text-emerald-600' : 'text-red-600'}`}>
        {successful ? 'Payment successful' : 'Payment unsuccessful'}
      </p>
      <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">
        {successful ? 'Thank you for your order!' : 'We could not complete your payment'}
      </h1>
      <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">
        {message || (successful ? 'Your order has been received and is being prepared.' : 'Your cart is still saved. You can try the payment again.')}
      </p>
      {orderId ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Order ID: {orderId}</p> : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {!successful && onRetry ? <button type="button" onClick={onRetry} className="rounded-full bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600">Try again</button> : null}
        <Link to="/product" className="rounded-full border border-slate-200 px-6 py-3 font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50">Continue shopping</Link>
      </div>
    </section>
  )
}
