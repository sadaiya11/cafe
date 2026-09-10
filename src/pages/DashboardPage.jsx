import { useEffect, useState } from 'react'
import SectionHeader from '../components/SectionHeader'
import FoodCard from '../components/FoodCard'
import HeroSlider from '../components/HeroSlider'
import InfoBanner from '../components/InfoBanner'
import SEO from '../components/SEO'
import { getLocalCatalog, loadCatalog } from '../services/productCatalog'

const cafeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CafeOrCoffeeShop',
  name: 'Bun Maska Café',
  image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
  '@id': 'https://bunmaskacafe.com/#cafe',
  url: 'https://bunmaskacafe.com',
  telephone: '+1-555-123-4567',
  priceRange: '₹₹',
  servesCuisine: ['Café', 'Bakery', 'Irani Chai', 'Snacks', 'Coffee'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: '123 Café Street, Downtown',
    addressLocality: 'City Center',
    postalCode: '90001',
    addressCountry: 'IN',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '11:00',
      closes: '02:30',
    },
  ],
}

export default function DashboardPage() {
  const [products, setProducts] = useState(getLocalCatalog)

  useEffect(() => {
    loadCatalog().then(setProducts)
  }, [])

  const popularItems = products.slice(0, 3)
  const categories = [...new Set(products.map((product) => product.category))].map((category) => {
    const categoryProducts = products.filter((product) => product.category === category)
    const firstVariant = categoryProducts[0]?.variants?.[0]
    return { name: category, image: firstVariant?.image ?? '', count: categoryProducts.length }
  })

  return (
    <div className="space-y-10 text-slate-800">
      <SEO
        title="Bun Maska Café - Fresh Breads, Irani Chai & Gourmet Coffee"
        description="Freshly baked artisanal bun maska, authentic Irani chai, gourmet coffee, burgers, and snacks. Order online for quick pickup or delivery."
        jsonLd={cafeJsonLd}
      />
      <HeroSlider />

      <section className="grid gap-4 rounded-[2rem] bg-white p-4 shadow-sm shadow-slate-200 md:grid-cols-3 md:p-6">
        {[
          { label: 'Free Delivery', value: 'On orders above ₹499' },
          { label: 'Freshly Made', value: 'Prepared daily in-house' },
          { label: 'Open Daily', value: '11:00 AM - 2:30 AM' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-500">{item.label}</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
        <SectionHeader
          eyebrow="Chef recommended"
          title="Popular food picks"
          subtitle="Freshly prepared favorites from our kitchen, loved by regulars and first-time guests alike."
        />

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {popularItems.map((item) => (
            <FoodCard
              key={item.slug}
              slug={item.slug}
              title={item.title}
              price={`₹${Number(item.variants?.[0]?.price ?? 0).toFixed(2)}`}
              tag={item.tag}
              image={item.variants?.[0]?.image ?? ''}
              description={item.description}
            />
          ))}
        </div>
      </section>

      <InfoBanner
        title="Weekend combo deal"
        text="Save up to 30% on combo meals for family dinners and office lunch orders."
        buttonText="Grab Offer"
      />

      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
        <SectionHeader
          eyebrow="Quick menu"
          title="Popular categories"
          subtitle="Explore our customer favorites across wraps, grill, packs, and comfort classics."
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <a key={category.name} href={`/product?category=${encodeURIComponent(category.name)}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-1 hover:shadow-lg">
              <img src={category.image} alt={category.name} className="h-36 w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="p-5">
                <h3 className="text-xl font-bold text-slate-900">{category.name}</h3>
                <p className="mt-2 text-sm font-semibold text-orange-600">{category.count} {category.count === 1 ? 'product' : 'products'}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
