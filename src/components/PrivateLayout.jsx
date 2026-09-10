import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'
import OrdersPage from '../pages/OrdersPage'
import MenuPage from '../pages/MenuPage'
import ProfilePage from '../pages/ProfilePage'

const privateNav = [
  { name: 'Dashboard', path: '/app/dashboard' },
  { name: 'Orders', path: '/app/orders' },
  { name: 'Menu', path: '/app/menu' },
  { name: 'Profile', path: '/app/profile' },
]

export default function PrivateLayout({ onLogout }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Cafe</p>
            <h2 className="mt-1 text-xl font-bold text-white">Dashboard</h2>
          </div>
        </div>

        <nav className="mt-6 space-y-2 px-4">
          {privateNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive || (location.pathname === '/app' && item.path === '/app/dashboard')
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 w-full rounded-xl border border-slate-700 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-red-500 hover:text-red-300"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="ml-64 min-h-screen px-6 py-8">
        <Routes>
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app/dashboard" element={<DashboardPage />} />
          <Route path="/app/orders" element={<OrdersPage />} />
          <Route path="/app/menu" element={<MenuPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
