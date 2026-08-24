import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
export default function Header() {
  const { cart, user, logout } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-[#fff9ed] shadow-sm">
      <div className="bg-coral px-5 py-2 text-center text-[10px] font-extrabold uppercase tracking-[.18em] text-white sm:text-xs">
        Order ahead · Pickup in as little as 20 minutes · Made fresh for you
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="leading-none text-ink">
          <span className="display-tight block text-3xl leading-none tracking-tight">Brew &amp; Bite</span>
          <span className="mt-1 block text-center text-[8px] font-extrabold uppercase tracking-[.3em] text-coral">Eat bold. Feel good.</span>
        </Link>
        <nav className="hidden items-center gap-6 text-xs font-extrabold uppercase tracking-[.1em] text-ink lg:flex">
          <NavLink to="/menu">Menu</NavLink>
          <NavLink to="/catering">Catering</NavLink>
          <NavLink to="/locations">Locations</NavLink>
          <NavLink to="/rewards">Rewards</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            className="relative rounded-full bg-ink p-2.5 text-white transition hover:bg-coral"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-coral text-[11px] font-bold">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="hidden items-center gap-2 text-sm font-semibold text-moss sm:flex"
            >
              <UserRound size={18} />
              {user.name.split(" ")[0]}
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full border-2 border-ink px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-white sm:block"
            >
              Sign in
            </Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 text-cocoa md:hidden" aria-label="Toggle navigation">{mobileOpen ? <X size={19} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {mobileOpen && <nav className="border-t-2 border-ink bg-[#fff9ed] px-5 py-4 lg:hidden"><div className="mx-auto flex max-w-6xl flex-col gap-1 text-sm font-extrabold uppercase text-ink"><NavLink onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 hover:bg-[#ffcf3a]" to="/menu">Menu</NavLink><NavLink onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 hover:bg-[#ffcf3a]" to="/catering">Catering</NavLink><NavLink onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 hover:bg-[#ffcf3a]" to="/locations">Locations</NavLink><NavLink onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 hover:bg-[#ffcf3a]" to="/rewards">Rewards</NavLink><NavLink onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 hover:bg-[#ffcf3a]" to="/orders">My orders</NavLink></div></nav>}
    </header>
  );
}
