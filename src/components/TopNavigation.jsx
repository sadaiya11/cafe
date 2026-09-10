import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { getStoreSettings } from '../services/storeSettingsService'

export default function TopNavigation({ brand = 'Bun Maska Café', cartCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false)
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
    { label: 'Admin', path: '/admin' },
    { label: 'POS', path: '/pos' },
  ]

  const handleLogout = () => {
    dispatch(logout())
    setMenuOpen(false)
    navigate('/dashboard')
  }

  const isStoreOpen = storeSettings?.isStoreOpen !== false

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      {!isStoreOpen && (
        <div className="bg-rose-600 text-white text-center py-2 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
          <span>🛑</span>
          <span>{storeSettings?.storeClosedNotice || 'Our cafe is currently closed for online orders.'}</span>
        </div>
      )}

      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link to="/dashboard" className="flex items-center gap-3 shrink-0" onClick={() => setMenuOpen(false)}>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-lg font-black text-white shadow-lg shadow-orange-200">
            {storeSettings?.storeName?.charAt(0) || 'B'}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-orange-500">Fresh taste</p>
            <p className="text-lg font-black text-slate-900">{storeSettings?.storeName || brand}</p>
          </div>
        </Link>

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
    </header>
  )
}
