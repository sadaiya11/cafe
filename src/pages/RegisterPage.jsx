import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { login } from '../store/authSlice'
import { registerUser } from '../services/api'
import SEO from '../components/SEO'

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || location.state?.from || '/dashboard'

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorNotice('')
    setSuccessNotice('')

    if (!email.trim() || !name.trim() || !password.trim()) {
      setErrorNotice('Please fill in your Email ID, User Name, and Password.')
      return
    }

    if (password.length < 4) {
      setErrorNotice('Password must be at least 4 characters long.')
      return
    }

    setLoading(true)

    try {
      const response = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role: 'CUSTOMER',
      })

      const registeredUser = response.user || { name: name.trim(), email: email.trim() }
      dispatch(login(registeredUser))
      setSuccessNotice('Account registered successfully! Redirecting...')
      
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 1000)
    } catch (err) {
      setErrorNotice(err.message || 'Registration failed. Please check details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <SEO title="Register Account | Bun Maska Café" noindex={true} />
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200 border border-slate-100">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            Bun Maska Cafe
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Create Account</h1>
          <p className="mt-2 text-sm text-slate-600">Register to place orders and track delivery status.</p>
        </div>

        {errorNotice && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-600 text-center">
            ⚠️ {errorNotice}
          </div>
        )}

        {successNotice && (
          <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-600 text-center">
            ✅ {successNotice}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Email ID *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">User Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Password *</label>
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
            {loading ? 'Creating Account...' : 'Register Account ➔'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm font-semibold text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-orange-600 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  )
}
