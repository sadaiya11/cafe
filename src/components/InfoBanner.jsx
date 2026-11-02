import { Link } from 'react-router-dom'

export default function InfoBanner({ title, text, buttonText = 'Order Now' }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#006491] via-[#087ba7] to-[#e85b25] px-6 py-8 text-white shadow-xl shadow-sky-900/15 sm:px-9 sm:py-10">
      <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[28px] border-white/10" />
      <div className="pointer-events-none absolute -bottom-28 right-1/3 -z-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-orange-100">A little treat awaits</p>
          <h3 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">{title}</h3>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/85 sm:text-base">{text}</p>
        </div>
        <Link to="/product" className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-[#006491] shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-50">
          {buttonText} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
