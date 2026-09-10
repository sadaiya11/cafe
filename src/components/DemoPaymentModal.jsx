import { useState } from 'react'

const paymentTabs = ['Card', 'UPI']

export default function DemoPaymentModal({ amount, onSuccess, onFailure, onClose }) {
  const [tab, setTab] = useState('Card')
  const [value, setValue] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const submitPayment = (event, outcome = 'success') => {
    event.preventDefault()
    if (!value.trim()) {
      setError(tab === 'Card' ? 'Enter a demo card number to continue.' : 'Enter a UPI ID to continue.')
      return
    }

    setError('')
    setProcessing(true)
    window.setTimeout(() => {
      setProcessing(false)
      if (outcome === 'success') onSuccess(`DEMO-${Date.now()}`)
      else onFailure('The demo payment was declined. Your cart is still saved.')
    }, 700)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">Demo payment</p><h2 className="mt-2 text-2xl font-black text-slate-900">Pay securely</h2></div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-800" aria-label="Close payment window">x</button>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-600">Amount to pay</span><strong className="text-xl text-orange-600">₹{amount.toFixed(2)}</strong></div>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">{paymentTabs.map((item) => <button key={item} type="button" onClick={() => { setTab(item); setValue(''); setError('') }} className={`rounded-lg py-2 text-sm font-bold ${tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{item}</button>)}</div>
        <form onSubmit={submitPayment} className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-slate-700">{tab === 'Card' ? 'Demo card number' : 'Demo UPI ID'}<input required value={value} onChange={(event) => setValue(event.target.value)} inputMode={tab === 'Card' ? 'numeric' : 'email'} placeholder={tab === 'Card' ? '4111 1111 1111 1111' : 'success@razorpay'} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-orange-400" /></label>
          {tab === 'Card' ? <div className="grid grid-cols-2 gap-3"><input required placeholder="MM / YY" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-orange-400" /><input required placeholder="CVV" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-orange-400" /></div> : null}
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <button disabled={processing} type="submit" className="w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60">{processing ? 'Processing payment...' : `Pay ₹${amount.toFixed(2)}`}</button>
          <button disabled={processing} type="button" onClick={(event) => submitPayment(event, 'failure')} className="w-full rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60">Simulate failed payment</button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">Demo mode only. No money is charged. Connect your Razorpay test key and backend before accepting real payments.</p>
      </div>
    </div>
  )
}
