import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { login } from '../store/authSlice'
import { googleLogin } from '../services/api'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

export default function GoogleAuthCallbackPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  // Share one exchange promise across React StrictMode's effect setup/cleanup cycle.
  const loginRequest = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    if (!loginRequest.current) {
      loginRequest.current = (async () => {
        if (!supabase) {
          throw new Error('Google sign-in is not configured. Please contact the café.')
        }

        try {
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw sessionError

          const accessToken = data.session?.access_token
          if (!accessToken) {
            throw new Error('Google sign-in could not be completed. Please try again.')
          }

          const response = await googleLogin(accessToken)
          if (!response?.token || !response?.user) {
            throw new Error('The server could not create your customer session.')
          }

          return response
        } finally {
          // The café API token is independent of Supabase's temporary OAuth session.
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        }
      })()
    }

    loginRequest.current
      .then((response) => {
        if (!active) return

        dispatch(login({
          ...response.user,
          token: response.token,
          loginProvider: 'google',
        }))

        const requestedPath = sessionStorage.getItem('bun-google-login-return-to')
        sessionStorage.removeItem('bun-google-login-return-to')
        const safePath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
          ? requestedPath
          : '/dashboard'

        navigate(safePath, { replace: true })
      })
      .catch((authError) => {
        if (active) {
          setError(authError.message || 'Google sign-in failed. Please try again.')
        }
      })

    return () => {
      active = false
    }
  }, [dispatch, navigate])

  return (
    <div className="flex min-h-[55vh] items-center justify-center p-4">
      <SEO title="Google Sign In | Bun Maska Café" noindex />
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl shadow-slate-200">
        {error ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl">!</div>
            <h1 className="mt-4 text-2xl font-black text-slate-900">Sign-in unsuccessful</h1>
            <p className="mt-3 text-sm leading-6 text-rose-600">{error}</p>
            <Link to="/login" className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              Back to Login
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-2xl">☕</div>
            <h1 className="mt-4 text-2xl font-black text-slate-900">Signing you in…</h1>
            <p className="mt-2 text-sm text-slate-500">Please wait while we securely connect your Google account.</p>
            <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" />
          </>
        )}
      </div>
    </div>
  )
}
