export default function StatCard({ label, value, tone = 'text-orange-500' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-4 text-3xl font-black ${tone}`}>{value}</p>
    </div>
  )
}
