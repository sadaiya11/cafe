import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { logoutUser } from '../services/api'
import { getStoreSettings, isStoreCurrentlyOpen } from '../services/storeSettingsService'

export default function TopNavigation({ brand = 'Bun Maska Café', cartCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLogoModal, setShowLogoModal] = useState(false)
  const [storeSettings, setStoreSettings] = useState(getStoreSettings)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  useEffect(() => {
    const handleUpdate = () => setStoreSettings(getStoreSettings())
    window.addEventListener('bun_store_settings_updated', handleUpdate)
    return () => window.removeEventListener('bun_store_settings_updated', handleUpdate)
  }, [])

  const items = [
    { label: 'Home', path: '/dashboard' },
    { label: 'Products', path: '/product' },
    { label: 'Cart', path: '/cart' },
    ...(isAuthenticated
      ? [
        { label: 'Orders', path: '/orders' },
        { label: 'Profile', path: '/profile' },
      ]
      : []),
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ]

  const handleLogout = async () => {
    await logoutUser().catch(() => {})
    dispatch(logout())
    setMenuOpen(false)
    navigate('/dashboard')
  }

  const isStoreOpen = isStoreCurrentlyOpen(storeSettings)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3 shrink-0">
          {/* Logo Container: Logo Image links to Home, Magnifying Glass appears on hover to open HD Big Logo */}
          <div className="relative shrink-0 group">
            {/* Clicking Logo Image redirects to Home Page */}
            <Link to="/dashboard" onClick={() => setMenuOpen(false)} title="Go to Home Page" className="block">
              <img
                src="/logo.png"
                alt="Bun Maska Café Logo"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-contain shadow-md border-2 border-amber-400 bg-amber-50 p-0.5 transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            {/* Dedicated Magnifying Glass Button (Visible ONLY on Hover) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowLogoModal(true)
              }}
              title="Click magnifying glass to view HD big logo"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-md border-2 border-white text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 hover:bg-amber-600 hover:scale-110 active:scale-95"
            >
              🔍
            </button>
          </div>

          <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.32em] text-orange-600">Fresh Taste & Chai</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{storeSettings?.storeName || brand}</p>
          </Link>
        </div>

        <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5 md:flex">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${isActive ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-700 hover:bg-slate-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            aria-label={`Cart with ${cartCount} items`}
            className="relative rounded-full border border-slate-200 p-3 text-lg transition hover:border-orange-300 hover:bg-orange-50"
          >
            <span aria-hidden="true">🛒</span>
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 sm:flex"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span>{user?.name || user?.email?.split('@')[0] || 'User'}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
            >
              Login
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 md:hidden"
          >
            {menuOpen ? '×' : '☰'}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-orange-500 text-white' : 'text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 text-left rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Logout ({user?.email})
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* High-Resolution HD Logo Lightbox Modal */}
      {showLogoModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
            onClick={() => setShowLogoModal(false)}
          >
            <div
              className="relative max-w-sm sm:max-w-md w-full rounded-3xl bg-white p-6 shadow-2xl border border-amber-200 text-center my-auto animate-in fade-in zoom-in duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center z-10"
              >
                ✕
              </button>
              <div className="pt-2">
                <img
                  src="/logo.png"
                  alt="Bun Maska Café High Quality Logo"
                  className="mx-auto w-full max-w-[280px] sm:max-w-[320px] max-h-[55vh] object-contain drop-shadow-xl"
                />
                <h3 className="mt-3 text-lg font-black text-slate-900">Bun Maska Café</h3>
                <p className="text-xs font-bold text-orange-600 tracking-wider uppercase mt-1">
                  📞 8085700750 • 📷 @bun_maska_cafe
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  )
}
