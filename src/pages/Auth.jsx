import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
export default function Auth({ mode }) {
  const register = mode === "register";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(register ? "register" : "login", form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="grid min-h-[calc(100vh-73px)] place-items-center px-5 py-12">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-stone-100"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-coral">
          Brew & Bite Club
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          {register ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-stone-500">
          {register
            ? "Save your favourites and order in seconds."
            : "Sign in to see your orders and checkout."}
        </p>
        {error && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-4">
          {register && (
            <Field
              label="Your name"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
            />
          )}
          <Field
            label="Email address"
            type="email"
            value={form.email}
            onChange={(email) => setForm({ ...form, email })}
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
          />
        </div>
        <button
          disabled={busy}
          className="mt-7 w-full rounded-full bg-moss py-3.5 font-bold text-white disabled:opacity-60"
        >
          {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
        </button>
        <p className="mt-6 text-center text-sm text-stone-500">
          {register ? "Already have an account?" : "New to Brew & Bite?"}{" "}
          <Link
            className="font-bold text-coral"
            to={register ? "/login" : "/register"}
          >
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </section>
  );
}
function Field({ label, type = "text", value, onChange }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <input
        required
        minLength={type === "password" ? 6 : undefined}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-moss"
      />
    </label>
  );
}
