import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, Route, Routes } from 'react-router-dom'
import TopNavigation from './TopNavigation'
import ProtectedRoute from './ProtectedRoute'
import CustomerNotificationToast from './CustomerNotificationToast'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import InfoPage from '../pages/InfoPage'
import DashboardPage from '../pages/DashboardPage'
import ProductDetailPage from '../pages/ProductDetailPage'
import ProductListPage from '../pages/ProductListPage'
import CartPage from '../pages/CartPage'
import CheckoutPage from '../pages/CheckoutPage'
import OrdersPage from '../pages/OrdersPage'
import ProfilePage from '../pages/ProfilePage'
import { useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { useCart } from '../context/useCart'
import { getStoreSettings } from '../services/storeSettingsService'

const socialPlatforms = [
  ['Instagram', 'instagram'],
  ['Facebook', 'facebook'],
  ['X / Twitter', 'twitter'],
  ['YouTube', 'youtube'],
  ['WhatsApp', 'whatsapp'],
  ['Google Business', 'googleBusiness'],
]

export default function PublicLayout() {
  const { itemCount } = useCart()
  const dispatch = useDispatch()

  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout())
    }
    window.addEventListener('bun_customer_unauthorized', handleUnauthorized)
    return () => window.removeEventListener('bun_customer_unauthorized', handleUnauthorized)
  }, [dispatch])

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-800">
      <CustomerNotificationToast />
      <TopNavigation brand="Bun Maska Café" cartCount={itemCount} />

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 md:px-8">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/product" element={<ProductListPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/offers" element={<InfoPage title="Special Offers" description="Enjoy the best combo deals, family packs, and chef specials prepared fresh for you." />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/about"
            element={
              <InfoPage
                title="About Us"
                description="Fresh breads, premium coffee, and a warm neighborhood vibe."
              />
            }
          />
          <Route
            path="/contact"
            element={
              <InfoPage
                title="Contact"
                description="Call us at 8085700750 or visit us in downtown."
              />
            }
          />

          {/* Protected Routes: Accessible only when logged in */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        <p className="font-semibold text-slate-700">Bun Maska Café</p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {socialPlatforms.map(([label, key]) => {
            const href = getStoreSettings().socialLinks?.[key]
            return href ? <a key={key} href={href} target="_blank" rel="noreferrer" className="hover:text-orange-600">{label}</a> : null
          })}
        </div>
      </footer>
    </div>
  )
}
