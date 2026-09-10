import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { login } from '../store/authSlice'
import { loginUser } from '../services/api'
import SEO from '../components/SEO'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || location.state?.from || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorNotice('')

    if (!email.trim() || !password.trim()) {
      setErrorNotice('Please enter your email address and password.')
      return
    }

    setLoading(true)

    try {
      const response = await loginUser({ email: email.trim(), password: password.trim() })
      const authenticatedUser = response.user || { email: email.trim(), name: email.split('@')[0] }
      
      dispatch(login(authenticatedUser))
      navigate(from, { replace: true })
    } catch (err) {
      setErrorNotice(err.message || 'Invalid email or password. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <SEO title="Sign In | Bun Maska Café" noindex={true} />
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200 border border-slate-100">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            Bun Maska Cafe
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with your registered email ID and password.</p>
        </div>

        {errorNotice && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-600 text-center">
            ⚠️ {errorNotice}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Password *</label>
              <Link to="/forgot-password" className="text-xs font-bold text-orange-600 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In ➔'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm font-semibold text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-orange-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  )
}
