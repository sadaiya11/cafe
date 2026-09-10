import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AdminPortal from './admin/App'
import PosApp from './pos/PosApp'
import AdminAuthGuard from './components/AdminAuthGuard'
import { CartProvider } from './context/CartContext'

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
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
