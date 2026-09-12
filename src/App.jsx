import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AdminPortal from './admin/App'
import PosApp from './pos/PosApp'
import AdminAuthGuard from './components/AdminAuthGuard'
import ScrollToTop from './components/ScrollToTop'
import { CartProvider } from './context/CartContext'
import { fetchStoreSettingsFromServer, fetchHeroSlidesFromServer } from './services/storeSettingsService'

function App() {
  useEffect(() => {
    fetchStoreSettingsFromServer()
    fetchHeroSlidesFromServer()
  }, [])

  return (
    <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route
            path="/admin/*"
            element={
              <AdminAuthGuard target="admin">
                <AdminPortal />
              </AdminAuthGuard>
            }
          />
          <Route
            path="/pos/*"
            element={
              <AdminAuthGuard target="pos">
                <PosApp />
              </AdminAuthGuard>
            }
          />
          <Route path="/*" element={<PublicLayout />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}

export default App

