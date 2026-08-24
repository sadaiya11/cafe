import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import ProductDetails from "./pages/ProductDetails";
import Footer from "./components/Footer";
import Catering from "./pages/Catering";
import Locations from "./pages/Locations";
import Rewards from "./pages/Rewards";
import WhatsNew from "./pages/WhatsNew";
export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/catering" element={<Catering />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/menu/whats-new" element={<WhatsNew />} />
          <Route path="/menu/whats-new/classic-lemonade" element={<WhatsNew />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
