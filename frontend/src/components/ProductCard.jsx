import { ArrowUpRight, Plus, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
export default function ProductCard({ product }) {
  const { addToCart } = useApp();
  return (
    <article className="group overflow-hidden border-2 border-ink bg-white transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#e5261f]">
      <div
        className="relative grid h-48 place-items-center"
        style={{
          background: `linear-gradient(135deg, ${product.color}, #fff0d5)`,
        }}
      >
        <span className="text-7xl drop-shadow-md transition group-hover:scale-110">
          {product.emoji}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2 py-1 text-xs font-bold text-ink">
          <Star
            className="mr-1 inline fill-amber-400 text-amber-400"
            size={13}
          />
          {product.rating}
        </span>
      </div>
      <div className="p-5">
        <Link to={`/products/${product.id}`} className="block">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-coral">
          {product.category}
        </p>
        <h3 className="flex items-center justify-between gap-2 text-lg font-bold text-ink">{product.name}<ArrowUpRight size={17} className="shrink-0 text-coral opacity-0 transition group-hover:opacity-100" /></h3>
        <p className="mt-1 h-10 text-sm text-stone-500">
          {product.description}
        </p>
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <strong className="text-xl text-cocoa">₹{product.price}</strong>
          <button
            onClick={() => addToCart(product)}
            className="grid h-10 w-10 place-items-center rounded-full bg-cocoa text-white transition hover:scale-110 hover:bg-coral"
            aria-label={`Add ${product.name}`}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
