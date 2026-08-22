import { ArrowUpRight, Camera, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#211511] px-5 pb-7 pt-14 text-[#f9edda]">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.35fr_.7fr_.9fr]">
        <div>
          <p className="font-display text-4xl">Brew &amp; Bite</p>
          <p className="mt-4 max-w-sm leading-7 text-[#f9edda]/65">Your neighbourhood pause for beautiful coffee, generous plates and fresh-baked comfort.</p>
          <a href="https://instagram.com" className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition hover:bg-coral" aria-label="Instagram"><Camera size={18} /></a>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-biscuit">Explore</p>
          <div className="mt-5 flex flex-col gap-3 text-sm text-[#f9edda]/75">
            <Link to="/menu" className="hover:text-white">Our menu</Link>
            <Link to="/orders" className="hover:text-white">My orders</Link>
            <a href="/#our-story" className="hover:text-white">Our story</a>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-biscuit">Visit us</p>
          <div className="mt-5 space-y-4 text-sm text-[#f9edda]/75">
            <p className="flex gap-3"><MapPin className="shrink-0 text-biscuit" size={18} /> Park Street · Salt Lake · Ballygunge</p>
            <p className="flex gap-3"><Phone className="shrink-0 text-biscuit" size={18} /> +91 90000 12345</p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#f9edda]/45 sm:flex-row sm:justify-between"><span>© 2026 Brew &amp; Bite Café &amp; Kitchen</span><a className="inline-flex items-center gap-1 hover:text-white" href="/#menu">Order ahead <ArrowUpRight size={13} /></a></div>
    </footer>
  );
}
