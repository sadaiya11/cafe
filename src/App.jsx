import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AdminPortal from './admin/App'
import PosApp from './pos/PosApp'
import { CartProvider } from './context/CartContext'

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminPortal />} />
          <Route path="/pos/*" element={<PosApp />} />
          <Route path="/*" element={<PublicLayout />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}

export default App
