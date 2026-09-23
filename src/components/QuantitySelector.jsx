export default function QuantitySelector({ value, quantity, onChange, onIncrease, onDecrease }) {
  const currentQuantity = value ?? quantity ?? 1

  const handleDecrease = () => {
    const nextValue = Math.max(1, currentQuantity - 1)
    if (onDecrease) {
      onDecrease()
    } else if (onChange) {
      onChange(nextValue)
    }
  }

  const handleIncrease = () => {
    const nextValue = currentQuantity + 1
    if (onIncrease) {
      onIncrease()
    } else if (onChange) {
      onChange(nextValue)
    }
  }

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={handleDecrease}
        className="flex h-12 w-12 items-center justify-center text-2xl text-slate-700 transition hover:bg-slate-200"
      >
        −
      </button>

      <span className="min-w-12 text-center text-lg font-bold text-slate-900">{currentQuantity}</span>

      <button
        type="button"
        onClick={handleIncrease}
        className="flex h-12 w-12 items-center justify-center text-2xl text-slate-700 transition hover:bg-slate-200"
      >
        +
      </button>
    </div>
  )
}

