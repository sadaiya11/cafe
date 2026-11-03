import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { login } from '../store/authSlice'
import { loginUser } from '../services/api'
import { supabase } from '../lib/supabase'
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
      const authenticatedUser = { ...(response.user || { email: email.trim(), name: email.split('@')[0] }), token: response.token }
      
      dispatch(login(authenticatedUser))
      navigate(from, { replace: true })
    } catch (err) {
      setErrorNotice(err.message || 'Invalid email or password. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setErrorNotice('')
    if (!supabase) {
      setErrorNotice('Google sign-in is not configured. Please contact the café.')
      return
    }

    setLoading(true)
    try {
      sessionStorage.setItem('bun-google-login-return-to', from)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (err) {
      sessionStorage.removeItem('bun-google-login-return-to')
      setErrorNotice(err.message || 'Unable to start Google sign-in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-3">
      <SEO title="Sign In | Bun Maska Café" noindex={true} />
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 sm:p-7 shadow-xl shadow-slate-200 border border-slate-100">
        <div className="mb-5 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            Bun Maska Cafe
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with your registered email ID and password.</p>
        </div>

        {errorNotice && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-600 text-center">
            ⚠️ {errorNotice}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-orange-500 px-6 py-3.5 font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In ➔'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Or continue with</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || !supabase}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.73 6C44.43 37.93 46.98 31.8 46.98 24.55Z" />
            <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
          </svg>
          {loading ? 'Connecting to Google…' : 'Continue with Google'}
        </button>

        <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm font-semibold text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-orange-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  )
}
