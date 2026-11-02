import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import FoodCard from '../components/FoodCard'
import HeroSlider from '../components/HeroSlider'
import InfoBanner from '../components/InfoBanner'
import SEO from '../components/SEO'
import { getLocalCatalog, loadCatalog } from '../services/productCatalog'
import { getStoreSettings } from '../services/storeSettingsService'

const storeSettings = getStoreSettings()
const socialLinks = Object.values(storeSettings.socialLinks || {}).filter(Boolean)

const cafeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CafeOrCoffeeShop',
  name: 'Bun Maska Café',
  image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
  '@id': 'https://bunmasska.in/#cafe',
  url: 'https://bunmasska.in',
  telephone: '+91-8085700750',
  priceRange: '₹₹',
  servesCuisine: ['Café', 'Bakery', 'Bun Maska', 'Vegetarian Burgers', 'Maggi', 'Noodles', 'French Fries', 'Momos', 'Snacks', 'Coffee'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Sisodiya Colony, Guna M.P.',
    addressLocality: 'Guna',
    postalCode: '473001',
    addressCountry: 'IN',
  },
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '11:00',
    closes: '02:30',
  }],
  sameAs: socialLinks,
}

const benefits = [
  { icon: '🥖', title: 'Freshly prepared', text: 'Made fresh when you order.' },
  { icon: '☕', title: 'Cafe favourites', text: 'Comfort food, chai and coffee.' },
  { icon: '🛵', title: 'Easy ordering', text: 'A few taps from menu to checkout.' },
]

export default function DashboardPage() {
  const [products, setProducts] = useState(getLocalCatalog)

  useEffect(() => {
    const refresh = () => loadCatalog().then(setProducts)
    refresh()
    window.addEventListener('bun_catalog_updated', refresh)
    return () => window.removeEventListener('bun_catalog_updated', refresh)
  }, [])

  const popularItems = products.slice(0, 3)
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].map((category) => {
    const categoryProducts = products.filter((product) => product.category === category)
    const firstVariant = categoryProducts.find((product) => product.variants?.[0]?.image)?.variants?.[0]
    return { name: category, image: firstVariant?.image ?? '', count: categoryProducts.length }
  })

  return (
    <div className="customer-home space-y-8 pb-8 sm:space-y-12">
      <SEO
        title="Bun Maska Café - Fresh Breads, Irani Chai & Gourmet Coffee"
        description="Freshly baked artisanal bun maska, authentic Irani chai, gourmet coffee, burgers, and snacks. Order online for quick pickup or delivery."
        jsonLd={cafeJsonLd}
      />

      <HeroSlider />

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: '🚚', label: 'Free delivery', detail: `On orders above ₹${storeSettings.freeDeliveryThreshold || 220}` },
          { icon: '🥪', label: 'Made fresh', detail: 'Prepared with care, every day' },
          { icon: '📍', label: 'Find our cafe', detail: storeSettings.city || 'Guna, Madhya Pradesh' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/60 sm:px-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#006491]">{item.label}</p>
              <p className="mt-0.5 truncate text-sm text-slate-500">{item.detail}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white px-5 py-7 shadow-sm shadow-slate-200/70 sm:px-7 sm:py-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Explore the menu"
            title="What are you craving today?"
            subtitle="Find your favourite comfort food, freshly prepared at Bun Maska Café."
          />
          <Link to="/product" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#006491] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5 hover:bg-[#004f73]">
            Explore full menu <span aria-hidden="true">→</span>
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/product?category=${encodeURIComponent(category.name)}`}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:-translate-y-1 hover:border-orange-200 hover:bg-orange-50/60 hover:shadow-md"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-orange-100 ring-2 ring-white">
                  {category.image ? <img src={category.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /> : <span className="flex h-full items-center justify-center text-2xl">🍽️</span>}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-slate-800 group-hover:text-[#006491]">{category.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{category.count} {category.count === 1 ? 'item' : 'items'}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Our menu is being updated. Please check back shortly.</p>
        )}
      </section>

      <section className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Handpicked for you"
            title="Popular food picks"
            subtitle="The delicious favourites guests come back for."
          />
          <Link to="/product" className="w-fit text-sm font-extrabold text-[#006491] transition hover:text-orange-600">See all items →</Link>
        </div>
        {popularItems.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {popularItems.map((item) => (
              <FoodCard
                key={item.slug}
                slug={item.slug}
                title={item.title}
                price={`₹${Number(item.variants?.[0]?.price ?? 0).toFixed(0)}`}
                tag={item.tag}
                image={item.variants?.[0]?.image ?? ''}
                description={item.description}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <span className="text-4xl">🍔</span>
            <p className="mt-3 font-bold text-slate-800">Fresh favourites are coming soon</p>
            <p className="mt-1 text-sm text-slate-500">Please visit the menu again in a little while.</p>
          </div>
        )}
      </section>

      <InfoBanner
        title="Make it a meal to remember"
        text="Explore our menu for cafe favourites, tasty combos and something delicious for every craving."
        buttonText="Explore menu"
      />

      <section className="rounded-[2rem] bg-[#f0f7fa] px-5 py-8 sm:px-8 sm:py-10">
        <SectionHeader
          eyebrow="The Bun Maska experience"
          title="Good food. Good mood."
          subtitle="A little something for every part of your day."
          align="center"
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl">{benefit.icon}</span>
              <h3 className="mt-4 font-extrabold text-[#006491]">{benefit.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
