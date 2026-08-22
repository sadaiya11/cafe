import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { useApp } from "../context/AppContext";
export default function Orders() {
  const { user } = useApp();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const { state } = useLocation();
  useEffect(() => {
    if (user)
      api("/orders/my-orders")
        .then(setOrders)
        .catch((e) => setError(e.message));
  }, [user]);
  if (!user)
    return (
      <section className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-4xl">Your orders live here</h1>
        <p className="mt-3 text-stone-500">
          Sign in to view your café pickups.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-full bg-moss px-6 py-3 font-bold text-white"
        >
          Sign in
        </Link>
      </section>
    );
  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-sm font-bold uppercase tracking-widest text-coral">
        Order history
      </p>
      <h1 className="font-display text-4xl">Your café moments</h1>
      {state?.paid && (
        <p className="mt-6 rounded-2xl bg-green-100 p-4 font-semibold text-moss">
          Payment complete! Your order has been sent to the kitchen.
        </p>
      )}
      {error && <p className="mt-6 text-red-600">{error}</p>}
      <div className="mt-7 space-y-4">
        {orders.map((order) => (
          <article
            className="rounded-2xl bg-white p-5 shadow-sm"
            key={order.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink">
                  Order #{order.id.slice(-6).toUpperCase()}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {order.outlet} ·{" "}
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-moss">
                {order.status}
              </span>
            </div>
            <p className="mt-4 text-sm text-stone-600">
              {order.items
                .map((item) => `${item.quantity}× ${item.name}`)
                .join(" · ")}
            </p>
            <div className="mt-4 flex justify-between border-t pt-4 font-bold">
              <span>Paid online</span>
              <span>₹{order.subtotal}</span>
            </div>
          </article>
        ))}
        {!orders.length && (
          <div className="rounded-2xl bg-white p-8 text-center text-stone-500">
            No orders yet.{" "}
            <Link className="font-bold text-coral" to="/">
              Pick something delicious
            </Link>
            .
          </div>
        )}
      </div>
    </section>
  );
}
