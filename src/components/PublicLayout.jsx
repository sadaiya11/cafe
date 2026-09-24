import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
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
  ['Instagram', 'instagram', 'instagram'],
  ['Facebook', 'facebook', 'facebook'],
  ['X / Twitter', 'twitter', 'twitter'],
  ['YouTube', 'youtube', 'youtube'],
  ['WhatsApp', 'whatsapp', 'whatsapp'],
  ['Google Business', 'googleBusiness', 'map'],
]

function SocialIcon({ name }) {
  const commonProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

  if (name === 'instagram') return <svg {...commonProps}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" /></svg>
  if (name === 'facebook') return <svg {...commonProps}><path d="M14 8h3V4h-3c-3.3 0-5 1.9-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1Z" fill="currentColor" stroke="none" /></svg>
  if (name === 'twitter') return <svg {...commonProps}><path d="M18.2 5.8c.8-.1 1.5-.5 2-1.1-.3.9-.9 1.5-1.7 1.9.1 5.7-4 11.4-11.8 11.4-2.3 0-4.5-.7-6.3-1.9 2.2.3 4.2-.4 5.6-1.6-1.8 0-3.2-1.2-3.7-2.8.6.1 1.2.1 1.8-.1-2-.4-3.3-2.1-3.2-4.1.5.3 1.1.5 1.8.5-1.9-1.3-2.4-3.8-1.3-5.7 2 2.4 5 4 8.3 4.1-.5-2.1 1.1-4.1 3.2-4.1 1 0 1.9.4 2.5 1.1.8-.1 1.5-.4 2.1-.8-.3.8-.8 1.4-1.5 1.8Z" fill="currentColor" stroke="none" /></svg>
  if (name === 'youtube') return <svg {...commonProps}><rect x="2.5" y="5" width="19" height="14" rx="4" fill="currentColor" stroke="none" /><path d="m10 9 5 3-5 3V9Z" fill="white" stroke="none" /></svg>
  if (name === 'whatsapp') return <svg {...commonProps}><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" /><path d="M8.5 8.5c.3-.5.6-.5.9-.1l.8 1c.2.3.2.5 0 .8l-.4.5c.7 1.3 1.6 2.1 2.9 2.8l.5-.4c.3-.2.5-.2.8 0l1 .8c.4.3.4.6-.1.9-.5.4-1.1.5-1.7.3-2.7-.9-4.6-2.8-5.5-5.5-.2-.6-.1-1.2.3-1.7Z" /></svg>
  return <svg {...commonProps}><path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
}

export default function PublicLayout() {
  const { itemCount } = useCart()
  const dispatch = useDispatch()
  const [storeSettings, setStoreSettings] = useState(getStoreSettings)

  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout())
    }
    window.addEventListener('bun_customer_unauthorized', handleUnauthorized)
    return () => window.removeEventListener('bun_customer_unauthorized', handleUnauthorized)
  }, [dispatch])

  useEffect(() => {
    const handleSettingsUpdate = () => setStoreSettings(getStoreSettings())
    window.addEventListener('bun_store_settings_updated', handleSettingsUpdate)
    return () => window.removeEventListener('bun_store_settings_updated', handleSettingsUpdate)
  }, [])

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

          {/* Checkout & Orders: Accessible to both Guest and Logged-in Customers */}
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />

          {/* Protected Routes: Accessible only when logged in */}
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
      <footer className="border-t border-slate-200 bg-slate-900 px-4 py-10 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-lg font-black text-white">{storeSettings.storeName}</h2>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
              Fresh Bun Maska, Maggi, momos, loaded sandwiches, and French fries prepared daily.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-300">Explore</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <Link to="/product" className="hover:text-white">Our Menu</Link>
              <Link to="/orders" className="hover:text-white">Track Order</Link>
              <Link to="/offers" className="hover:text-white">Special Offers</Link>
              <Link to="/about" className="hover:text-white">About Us</Link>
              <Link to="/contact" className="hover:text-white">Contact Us</Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-300">Contact</h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-400">
              <a href={`tel:${storeSettings.phone}`} className="hover:text-white">{storeSettings.phone}</a>
              <a href={`mailto:${storeSettings.email}`} className="break-words hover:text-white">{storeSettings.email}</a>
              <span>{storeSettings.address}, {storeSettings.city}</span>
              <span>{storeSettings.hours}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">Social Links</h3>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {socialPlatforms.map(([label, key, icon]) => {
                const href = storeSettings.socialLinks?.[key]
                return href ? (
                  <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-orange-300 hover:bg-orange-500 hover:text-white">
                    <SocialIcon name={icon} />
                  </a>
                ) : null
              })}
              {!Object.values(storeSettings.socialLinks || {}).some(Boolean) && <span className="text-slate-500">Social links coming soon</span>}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-slate-800 pt-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
