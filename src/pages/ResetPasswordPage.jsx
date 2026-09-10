import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { resetPassword } from '../services/api'
import SEO from '../components/SEO'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorNotice('')
    setSuccessNotice('')

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorNotice('Please fill in both password fields.')
      return
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorNotice('Passwords do not match. Please re-enter your password.')
      return
    }

    if (newPassword.trim().length < 4) {
      setErrorNotice('Password must be at least 4 characters long.')
      return
    }

    if (!token || !email) {
      setErrorNotice('Invalid or missing email verification link token.')
      return
    }

    setLoading(true)

    try {
      await resetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword: newPassword.trim(),
      })

      setSuccessNotice('Password reset successfully! Redirecting to login page...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1500)
    } catch (err) {
      setErrorNotice(err.message || 'Failed to reset password. Link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center p-4">
      <SEO title="Reset Password | Bun Maska Café" noindex={true} />
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200 border border-slate-100">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
            Bun Maska Cafe
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Set New Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            {email ? `Resetting password for: ${email}` : 'Enter your new account password below.'}
          </p>
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

        {!token || !email ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-800">
              ⚠️ Invalid or missing password reset link. Please click the reset link sent to your email.
            </div>
            <Link
              to="/forgot-password"
              className="inline-block rounded-full bg-orange-500 px-6 py-3 text-xs font-bold text-white transition hover:bg-orange-600 shadow-md shadow-orange-200"
            >
              Request New Reset Link ➔
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password ➔'}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm font-semibold text-slate-600">
          Back to{' '}
          <Link to="/login" className="font-bold text-orange-600 hover:underline">
            Sign in page
          </Link>
        </div>
      </div>
    </div>
  )
}
