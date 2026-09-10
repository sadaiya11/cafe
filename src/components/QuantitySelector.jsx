export default function QuantitySelector({ value = 1, onChange }) {
  const changeValue = (nextValue) => onChange?.(Math.max(1, nextValue))

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => changeValue(value - 1)}
        className="flex h-12 w-12 items-center justify-center text-2xl text-slate-700 transition hover:bg-slate-200"
      >
        −
      </button>

      <span className="min-w-12 text-center text-lg font-bold text-slate-900">{value}</span>

      <button
        type="button"
        onClick={() => changeValue(value + 1)}
        className="flex h-12 w-12 items-center justify-center text-2xl text-slate-700 transition hover:bg-slate-200"
      >
        +
      </button>
    </div>
  )
}
