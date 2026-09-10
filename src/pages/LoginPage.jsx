import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../store/authSlice'
import SEO from '../components/SEO'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || location.state?.from || '/checkout'

  const [email, setEmail] = useState('user@bunmaska.com')
  const [password, setPassword] = useState('123456')

  function handleSubmit(event) {
    event.preventDefault()
    dispatch(login({ name: 'Maya Reynolds', email }))
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <SEO title="Sign In | Bun Maska Café" noindex={true} />
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200 border border-slate-100">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            Bun Maska Cafe
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to view your orders and profile.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-200"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
