import { useState, useEffect } from 'react'
import { isStaffAuthenticated, loginStaff } from '../services/staffAuthService'

export default function AdminAuthGuard({ children, target = 'admin' }) {
  const [authenticated, setAuthenticated] = useState(isStaffAuthenticated)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [authMode, setAuthMode] = useState('password') // 'password' or 'pin'
  const [errorNotice, setErrorNotice] = useState('')

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthenticated(isStaffAuthenticated())
    }
    window.addEventListener('bun_staff_auth_changed', handleAuthChange)
    return () => window.removeEventListener('bun_staff_auth_changed', handleAuthChange)
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    setErrorNotice('')

    if (authMode === 'pin') {
      if (pin === '1234' || pin === '0000' || pin === '9999') {
        const sessionData = { authenticated: true, role: 'STAFF', user: 'Cashier Staff', loginTime: new Date().toISOString() }
        loginStaff(sessionData)
        setAuthenticated(true)
        return
      }
      setErrorNotice('Invalid PIN code. Try PIN: 1234')
      return
    }

    const u = username.trim().toLowerCase()
    const p = password.trim()

    if ((u === 'admin' || u === 'admin@bunmaskacafe.com' || u === 'staff') && (p === 'admin' || p === 'admin123' || p === '123456')) {
      const sessionData = { authenticated: true, role: u.includes('admin') ? 'ADMIN' : 'STAFF', user: u, loginTime: new Date().toISOString() }
      loginStaff(sessionData)
      setAuthenticated(true)
      return
    }

    setErrorNotice('Invalid username or password. Demo: admin / admin123')
  }

  const fillQuickDemo = (type) => {
    if (type === 'admin') {
      setUsername('admin@bunmaskacafe.com')
      setPassword('admin123')
      setAuthMode('password')
      setErrorNotice('')
    } else if (type === 'pin') {
      setPin('1234')
      setAuthMode('pin')
      setErrorNotice('')
    }
  }

  if (authenticated) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-amber-500/10 backdrop-blur-xl relative overflow-hidden">
        
        {/* Top Decorative Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/20">
            🔐
          </div>
          <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">
            Staff Security Check
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {target === 'pos' ? 'POS Billing Terminal' : 'Admin Management Portal'}
          </h1>
          <p className="text-xs text-slate-400">
            Restricted access. Please log in with staff credentials to proceed.
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="mt-6 flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs font-bold relative z-10">
          <button
            type="button"
            onClick={() => setAuthMode('password')}
            className={`flex-1 py-2 rounded-lg transition ${authMode === 'password' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}
          >
            🔑 Staff Account
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('pin')}
            className={`flex-1 py-2 rounded-lg transition ${authMode === 'pin' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}
          >
            🔢 Quick Staff PIN
          </button>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="mt-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300 text-center animate-shake relative z-10">
            ⚠️ {errorNotice}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4 relative z-10">
          {authMode === 'password' ? (
            <>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Username / Email</label>
                <input
                  type="text"
                  required
                  placeholder="admin@bunmaskacafe.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 text-center">Enter 4-Digit Staff PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                placeholder="1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xl font-mono tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            Unlock {target === 'pos' ? 'POS Terminal' : 'Admin Portal'} ➔
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2 relative z-10">
          <p className="text-[11px] text-slate-400 font-medium">Quick Demo Autofill:</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => fillQuickDemo('admin')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-amber-300 transition"
            >
              Demo Admin (admin123)
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('pin')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-amber-300 transition"
            >
              Demo PIN (1234)
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
