import { Link } from 'react-router-dom'

export default function FoodCard({ slug, title, price, tag, image, description }) {
  return (
    <Link to={`/product/${slug}`} className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60 transition duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/70">
      <div className="relative aspect-[1.55/1] overflow-hidden bg-orange-50">
        {image ? (
          <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🍽️</div>
        )}
        {tag ? <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-600 shadow-sm backdrop-blur">{tag}</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-extrabold leading-snug text-slate-900 transition group-hover:text-[#006491]">{title}</h3>
          <span className="shrink-0 rounded-xl bg-[#eef7fa] px-3 py-1.5 text-base font-black text-[#006491]">{price}</span>
        </div>
        {description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-400">Freshly prepared</span>
          <span className="inline-flex items-center gap-2 text-sm font-extrabold text-orange-600">View item <span className="transition group-hover:translate-x-1">→</span></span>
        </div>
      </div>
    </Link>
  )
}
