export default function MenuPage() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-3xl font-bold text-white">Menu</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Signature Bun', '₹120.00'],
          ['Cold Brew', '₹60.00'],
          ['Cheese Croissant', '₹95.00'],
          ['Matcha Cake', '₹110.00'],
          ['Cinnamon Roll', '₹80.00'],
          ['Berry Smoothie', '₹75.00'],
        ].map(([name, price]) => (
          <div key={name} className="rounded-2xl border border-slate-800 bg-slate-800/70 p-5">
            <div className="mb-4 h-28 rounded-xl bg-gradient-to-br from-sky-500/30 to-violet-500/30" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{name}</h3>
              <span className="text-sky-300">{price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
