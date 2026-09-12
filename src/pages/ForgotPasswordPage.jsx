import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../services/api'
import SEO from '../components/SEO'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')
  const [resetData, setResetData] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorNotice('')
    setResetData(null)

    if (!email.trim()) {
      setErrorNotice('Please enter your registered Email ID.')
      return
    }

    setLoading(true)

    try {
      const response = await forgotPassword({ email: email.trim() })
      setResetData(response)
    } catch (err) {
      setErrorNotice(err.message || 'Failed to process request. Please ensure the email is registered.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <SEO title="Forgot Password | Bun Maska Café" noindex={true} />
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200 border border-slate-100">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            Bun Maska Cafe
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Forgot Password?</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your registered email address below. We'll send you an email verification link to reset your password.
          </p>
        </div>

        {errorNotice && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-600 text-center">
            ⚠️ {errorNotice}
          </div>
        )}

        {resetData ? (
          <div className="space-y-6 text-center">
            <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-6 text-emerald-900">
              <div className="text-5xl mb-3">📧</div>
              <h2 className="text-xl font-black text-emerald-900">Check Your Email</h2>
              <p className="mt-2 text-xs font-semibold text-emerald-800 leading-relaxed">
                A password reset verification link has been sent to:<br />
                <strong className="text-emerald-950 font-bold underline text-sm">{resetData.email}</strong>
              </p>
              <p className="mt-4 text-xs text-slate-500">
                Please check your Google Mail inbox (and Spam folder) and click the link inside the email to reset your password.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block rounded-full bg-slate-900 px-6 py-3.5 text-xs font-bold text-white transition hover:bg-slate-800 shadow-md"
              >
                ← Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Registered Email ID *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
                placeholder="name@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-50"
            >
              {loading ? 'Sending Verification Link...' : 'Send Password Reset Link ➔'}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm font-semibold text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="font-bold text-orange-600 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  )
}
