import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";
const AppContext = createContext();
export const useApp = () => useContext(AppContext);
export function AppProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("brew-bite-user") || "null"),
  );
  const [cart, setCart] = useState(() =>
    JSON.parse(localStorage.getItem("brew-bite-cart") || "[]"),
  );
  useEffect(
    () => localStorage.setItem("brew-bite-cart", JSON.stringify(cart)),
    [cart],
  );
  const addToCart = (product) =>
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      return found
        ? current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...current, { ...product, quantity: 1 }];
    });
  const setQuantity = (id, quantity) =>
    setCart((current) =>
      quantity < 1
        ? current.filter((item) => item.id !== id)
        : current.map((item) =>
            item.id === id ? { ...item, quantity } : item,
          ),
    );
  const login = async (path, body) => {
    const data = await api(`/auth/${path}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    localStorage.setItem("brew-bite-token", data.token);
    localStorage.setItem("brew-bite-user", JSON.stringify(data.user));
    setUser(data.user);
  };
  const logout = () => {
    localStorage.removeItem("brew-bite-token");
    localStorage.removeItem("brew-bite-user");
    setUser(null);
  };
  return (
    <AppContext.Provider
      value={{
        user,
        cart,
        addToCart,
        setQuantity,
        login,
        logout,
        clearCart: () => setCart([]),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
