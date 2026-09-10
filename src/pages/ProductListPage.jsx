import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import SEO from '../components/SEO'
import { getLocalCatalog, loadCatalog } from '../services/productCatalog'

const formatPrice = (price) => `₹${Number(price).toFixed(2)}`

export default function ProductListPage() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState(getLocalCatalog)
  const category = searchParams.get('category')
  useEffect(() => { loadCatalog().then(setProducts) }, [])
  const availableProducts = products.filter((product) => product.inStock !== false)
  const visibleProducts = category ? availableProducts.filter((product) => product.category === category) : availableProducts

  const pageTitle = category ? `${category} Menu | Bun Maska Café` : 'Café Menu & Fresh Dishes | Bun Maska Café'
  const pageDescription = category
    ? `Explore our ${category} menu at Bun Maska Café. Prepared fresh with top-quality ingredients.`
    : 'Explore our complete café menu featuring Bun Maska, Irani Chai, gourmet coffee, burgers, pasta, desserts, and seafood specials.'

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category ? `${category} Menu` : 'Bun Maska Café Menu',
    description: pageDescription,
    numberOfItems: visibleProducts.length,
    itemListElement: visibleProducts.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: `https://bunmaskacafe.com/product/${item.slug}`,
      image: item.variants?.[0]?.image ?? '',
    })),
  }

  return (
    <div className="space-y-8 pb-8">
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords={`bun maska menu, ${category ? category.toLowerCase() + ',' : ''} cafe food, irani chai, coffee items, online menu`}
        jsonLd={itemListJsonLd}
      />
      <section className="rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-orange-600 p-8 text-white shadow-xl shadow-orange-200/20">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-orange-200">Online menu</p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">Our best dishes</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200">
          Discover curated favorites, chef specials, and daily bites made fresh for every craving.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
        <SectionHeader
          eyebrow="Menu"
          title={category || 'Popular selections'}
          subtitle={category ? `Showing ${visibleProducts.length} products in ${category}.` : 'Explore our handcrafted favorites and premium dining picks.'}
        />

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => {
            const defaultVariant = product.variants?.[0] ?? { price: 0, image: '' }

            return (
            <Link
              key={product.slug}
              to={`/product/${product.slug}`}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="overflow-hidden">
                <img
                  src={defaultVariant.image}
                  alt={product.title}
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                    {product.tag}
                  </span>
                  <span className="text-xl font-black text-slate-900">{formatPrice(defaultVariant.price)}</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{product.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{product.description}</p>
              </div>
            </Link>
            )
          })}
        </div>
        {!visibleProducts.length ? <p className="mt-8 text-center text-slate-600">No products found in this category.</p> : null}
      </section>
    </div>
  )
}
