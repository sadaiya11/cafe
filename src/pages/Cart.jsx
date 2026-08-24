import { Minus, Plus, Trash2, CreditCard, Clock3, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../api";
const outlets = [
  "Park Street, Kolkata",
  "Salt Lake, Kolkata",
  "Ballygunge, Kolkata",
];
export default function Cart() {
  const { cart, setQuantity, user, clearCart } = useApp();
  const [outlet, setOutlet] = useState(outlets[0]);
  const [pickupTime, setPickupTime] = useState("ASAP (20–25 min)");
  const [cardNumber, setCardNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const pay = async () => {
    if (!user) return navigate("/login");
    setBusy(true);
    setError("");
    try {
      const { order } = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          outlet,
          pickupTime,
          items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
        }),
      });
      await api("/payments/confirm", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id, cardNumber }),
      });
      clearCart();
      navigate("/orders", { state: { paid: true } });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (!cart.length)
    return (
      <section className="mx-auto max-w-xl px-5 py-24 text-center">
        <div className="text-6xl">🛍️</div>
        <h1 className="mt-5 font-display text-4xl">Your basket is empty</h1>
        <Link
          className="mt-6 inline-block rounded-full bg-moss px-6 py-3 font-bold text-white"
          to="/"
        >
          Browse menu
        </Link>
      </section>
    );
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1fr_390px]">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-coral">
          Almost there
        </p>
        <h1 className="font-display text-4xl text-ink">Your order</h1>
        <div className="mt-7 space-y-3">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
            >
              <div
                className="grid h-16 w-16 place-items-center rounded-xl text-3xl"
                style={{ background: item.color }}
              >
                {item.emoji}
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{item.name}</h3>
                <p className="text-sm text-stone-500">₹{item.price} each</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-stone-100 p-1">
                <button
                  onClick={() => setQuantity(item.id, item.quantity - 1)}
                  className="p-1"
                >
                  <Minus size={16} />
                </button>
                <span className="w-5 text-center text-sm font-bold">
                  {item.quantity}
                </span>
                <button
                  onClick={() => setQuantity(item.id, item.quantity + 1)}
                  className="p-1"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                onClick={() => setQuantity(item.id, 0)}
                className="text-stone-400 hover:text-coral"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <aside className="h-fit rounded-3xl bg-moss p-6 text-white">
        <h2 className="font-display text-3xl">Pickup & payment</h2>
        <label className="mt-5 block text-sm font-semibold">
          Choose outlet
          <select
            value={outlet}
            onChange={(e) => setOutlet(e.target.value)}
            className="mt-2 w-full rounded-xl bg-white px-3 py-3 text-ink outline-none"
          >
            {outlets.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold">Pickup time
          <div className="relative mt-2"><Clock3 className="pointer-events-none absolute left-3 top-3 text-moss" size={18} /><select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full rounded-xl bg-white py-3 pl-10 pr-3 text-ink outline-none"><option>ASAP (20–25 min)</option><option>In 30 minutes</option><option>In 45 minutes</option><option>In 1 hour</option></select></div>
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Card number <span className="font-normal text-white/60">(demo)</span>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 text-ink">
            <CreditCard size={18} />
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              className="w-full bg-transparent py-3 outline-none"
            />
          </div>
        </label>
        <div className="mt-6 border-t border-white/20 pt-5">
          <div className="flex justify-between text-white/70">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <div className="mt-3 flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>₹{subtotal}</span>
          </div>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          onClick={pay}
          className="mt-6 w-full rounded-full bg-coral py-3.5 font-bold text-white disabled:opacity-60"
        >
          {busy
            ? "Processing…"
            : user
              ? `Pay ₹${subtotal} securely`
              : "Sign in to pay"}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-white/60"><ShieldCheck size={14} /> Secure online payment · No cash on delivery</p>
      </aside>
    </section>
  );
}
