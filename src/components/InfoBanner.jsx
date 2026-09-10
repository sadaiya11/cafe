export default function InfoBanner({ title, text, buttonText = 'Order Now' }) {
  return (
    <section className="rounded-[2rem] bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 p-8 text-white shadow-xl shadow-orange-500/25 md:p-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-100">Special offer</p>
          <h3 className="mt-3 text-3xl font-black md:text-4xl">{title}</h3>
        </div>

        <div className="flex items-center gap-4">
          <p className="max-w-md text-sm text-orange-50 md:text-base">{text}</p>
          <button className="rounded-full bg-white px-6 py-3 text-sm font-bold text-orange-600 transition hover:bg-orange-50">
            {buttonText}
          </button>
        </div>
      </div>
    </section>
  )
}
