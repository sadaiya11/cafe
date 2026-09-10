import { Navigate, Route, Routes } from 'react-router-dom'
import TopNavigation from './TopNavigation'
import ProtectedRoute from './ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import InfoPage from '../pages/InfoPage'
import DashboardPage from '../pages/DashboardPage'
import ProductDetailPage from '../pages/ProductDetailPage'
import ProductListPage from '../pages/ProductListPage'
import CartPage from '../pages/CartPage'
import CheckoutPage from '../pages/CheckoutPage'
import OrdersPage from '../pages/OrdersPage'
import ProfilePage from '../pages/ProfilePage'
import { useCart } from '../context/useCart'

export default function PublicLayout() {
  const { itemCount } = useCart()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <TopNavigation brand="Bun Maska Café" cartCount={itemCount} />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/product" element={<ProductListPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/offers" element={<InfoPage title="Special Offers" description="Enjoy the best combo deals, family packs, and chef specials prepared fresh for you." />} />
          <Route path="/login" element={<LoginPage />} />
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
                description="Call us at +1 (555) 123-4567 or visit us in downtown."
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
    </div>
  )
}
