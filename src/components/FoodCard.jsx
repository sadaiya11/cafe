import { Link } from 'react-router-dom'

export default function FoodCard({ slug, title, price, tag, image, description }) {
  return (
    <Link to={`/product/${slug}`} className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {tag}
          </span>
          <span className="text-xl font-black text-slate-900">{price}</span>
        </div>

        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      </div>
    </Link>
  )
}
