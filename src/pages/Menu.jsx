import { Search, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import menuCategories from "../assets/menu-categories.png";
import ProductCard from "../components/ProductCard";

const categories = ["All", "Coffee", "Pizza", "Sandwich", "Noodles", "Dessert"];
const featureCards = [
  { tag: "Deal alert", title: "Everyday favourites", text: "Big café flavour, made fresh and ready for pickup.", position: "0%", to: "#all-items" },
  { tag: "Just landed", title: "What’s new", text: "Fresh additions, limited-time treats and new reasons to stop by.", position: "50%", to: "/menu/whats-new" },
  { tag: "Hot right now", title: "Toasted & tasty", text: "Melty, crunchy, satisfying sandwiches made when you order.", position: "100%", to: "#all-items" },
];

export default function Menu() {
  const [products, setProducts] = useState([]); const [category, setCategory] = useState("All"); const [search, setSearch] = useState("");
  useEffect(() => { api("/products").then(setProducts).catch(() => setProducts([])); }, []);
  const visible = products.filter((product) => (category === "All" || product.category === category) && `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase()));
  return <><section className="border-b-2 border-ink bg-white"><div className="mx-auto max-w-7xl px-5 py-8 md:py-10"><h1 className="display-tight text-6xl leading-none md:text-7xl">Menu</h1><div className="mt-10 grid gap-8 md:grid-cols-3">{featureCards.map((card) => <Link key={card.title} to={card.to} className="group block"><div className="relative h-52 overflow-hidden md:h-60"><div className="absolute inset-0 bg-cover bg-no-repeat transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${menuCategories})`, backgroundSize: "300% 100%", backgroundPosition: `${card.position} center` }} /><span className="absolute left-0 top-0 bg-coral px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white"><Star className="mr-1 inline fill-white" size={13} /> {card.tag} <Star className="ml-1 inline fill-white" size={13} /></span></div><h2 className="display-tight mt-5 text-3xl leading-none">{card.title}</h2><p className="mt-2 max-w-sm text-sm leading-5 text-stone-600">{card.text}</p></Link>)}</div></div></section><section id="all-items" className="mx-auto max-w-7xl px-5 py-12 md:py-16"><div className="flex flex-col gap-5 border-y-2 border-ink py-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-5 overflow-x-auto">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap border-b-4 pb-1 text-xs font-extrabold uppercase tracking-[.12em] ${category === item ? "border-coral text-ink" : "border-transparent text-stone-500 hover:text-ink"}`}>{item}</button>)}</div><label className="flex items-center gap-2 border-b border-ink py-2 text-stone-500"><Search size={17} /><input className="w-full bg-transparent text-sm outline-none lg:w-52" placeholder="Search menu" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="mt-10 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Pick your favourite</p><h2 className="display-tight mt-1 text-5xl">{category === "All" ? "All the good stuff" : category}</h2></div><span className="hidden text-sm font-semibold text-stone-500 sm:block">{visible.length} items</span></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{visible.map((product) => <ProductCard product={product} key={product.id} />)}</div>{!visible.length && <p className="py-16 text-center text-stone-500">No menu items match that search.</p>}</section></>;
}
