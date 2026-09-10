import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHeroSlides, getStoreSettings } from '../services/storeSettingsService'

export default function HeroSlider() {
  const [slides, setSlides] = useState(getHeroSlides)
  const [storeSettings, setStoreSettings] = useState(getStoreSettings)
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const handleUpdate = () => {
      setSlides(getHeroSlides())
      setStoreSettings(getStoreSettings())
    }
    window.addEventListener('bun_hero_slides_updated', handleUpdate)
    window.addEventListener('bun_store_settings_updated', handleUpdate)
    return () => {
      window.removeEventListener('bun_hero_slides_updated', handleUpdate)
      window.removeEventListener('bun_store_settings_updated', handleUpdate)
    }
  }, [])

  useEffect(() => {
    if (!slides.length) return
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 4000)

    return () => clearInterval(timer)
  }, [slides.length])

  const slide = slides[activeSlide] || slides[0] || {
    title: 'Bun Maska Cafe',
    subtitle: 'Freshly brewed chai and artisanal buns made fresh every day.',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1500&q=80',
    badge: 'Welcome'
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl shadow-orange-200/30">
      <div className="absolute inset-0">
        <img src={slide.image} alt={slide.title} className="h-full w-full object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/60 to-transparent" />
      </div>

      <div className="relative z-10 grid min-h-[520px] items-center px-6 py-10 md:px-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="max-w-xl">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-200 backdrop-blur-sm">
            {slide.badge}
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight text-white md:text-6xl">
            {slide.title}
          </h1>
          <p className="mt-5 max-w-lg text-base text-slate-200 md:text-lg">{slide.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/product" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-500/20">
              Order Online ➔
            </Link>
            <Link to="/offers" className="rounded-full border border-white/40 bg-transparent px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              View Special Offers
            </Link>
          </div>
        </div>

        <div className="hidden justify-end lg:flex">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/20 bg-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-orange-200">Store Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                storeSettings.isStoreOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {storeSettings.isStoreOpen ? '🟢 OPEN NOW' : '🛑 STORE CLOSED'}
              </span>
            </div>
            <div className="mt-6 space-y-3.5 text-white text-sm">
              <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                <span>Avg Delivery</span>
                <span className="font-bold text-orange-300">15-25 min</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                <span>Free Delivery</span>
                <span className="font-bold text-orange-300">Orders &gt; ₹{storeSettings.freeDeliveryThreshold || 500}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Location</span>
                <span className="text-right text-xs font-semibold text-slate-200 line-clamp-1 max-w-[180px]" title={storeSettings.address}>
                  📍 {storeSettings.city || 'Mumbai'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
        {slides.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => setActiveSlide(index)}
            className={`h-3 rounded-full transition ${
              index === activeSlide ? 'w-10 bg-orange-500' : 'w-3 bg-white/60 hover:bg-white'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
