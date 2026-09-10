import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductGallery from '../components/ProductGallery'
import QuantitySelector from '../components/QuantitySelector'
import SEO from '../components/SEO'
import { getLocalCatalog, loadCatalog } from '../services/productCatalog'
import { useCart } from '../context/useCart'

const formatPrice = (price) => `₹${Number(price).toFixed(2)}`

const defaultReviews = [
  { id: 1, name: 'Rahul Sharma', rating: 5, comment: 'Absolutely authentic Bun Maska! Soft, warm, and butter is perfect with Kullad Chai.', date: '2 days ago' },
  { id: 2, name: 'Priya Patel', rating: 5, comment: 'Best snack spot! Loved the fresh quality and fast service.', date: '1 week ago' },
  { id: 3, name: 'Aniket Verma', rating: 4, comment: 'Very tasty and delicious. Great portion size!', date: '2 weeks ago' },
]

export default function ProductDetailPage() {
  const { slug } = useParams()
  const [products, setProducts] = useState(getLocalCatalog)
  useEffect(() => { loadCatalog().then(setProducts) }, [])
  const product = products.find((item) => item.slug === slug)
  const navigate = useNavigate()
  const { addItem } = useCart()

  const initialVariant = product?.variants?.[0] ?? { size: 'small', label: 'Small', price: 0, image: '', gallery: [] }
  const [selectedSizeState, setSelectedSize] = useState(initialVariant.size)
  const [quantity, setQuantity] = useState(1)

  // Review & Rating State
  const [reviews, setReviews] = useState(() => {
    try {
      const stored = localStorage.getItem(`bun_maska_reviews_${slug}`)
      return stored ? JSON.parse(stored) : defaultReviews
    } catch {
      return defaultReviews
    }
  })
  const [userRating, setUserRating] = useState(5)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [notice, setNotice] = useState('')

  const selectedSize = product?.variants?.some((variant) => variant.size === selectedSizeState)
    ? selectedSizeState
    : initialVariant.size

  const selectedVariant = product?.variants?.find((variant) => variant.size === selectedSize) ?? initialVariant

  const relatedProducts = products.filter((item) => item.slug !== product?.slug && item.inStock !== false).slice(0, 3)

  const handleAddReview = (e) => {
    e.preventDefault()
    if (!reviewerName.trim() || !reviewComment.trim()) {
      setNotice('Please enter your name and comment.')
      return
    }

    const newRev = {
      id: Date.now(),
      name: reviewerName.trim(),
      rating: userRating,
      comment: reviewComment.trim(),
      date: 'Just now'
    }

    const updated = [newRev, ...reviews]
    setReviews(updated)
    try {
      localStorage.setItem(`bun_maska_reviews_${slug}`, JSON.stringify(updated))
    } catch {}

    setReviewerName('')
    setReviewComment('')
    setNotice('Thank you! Your review has been published.')
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
    : '5.0'

  if (!product) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center">
        <SEO title="Product Not Found | Bun Maska Café" noindex={true} />
        <h1 className="text-3xl font-black">Product not found</h1>
        <Link to="/product" className="mt-5 inline-block rounded-full bg-orange-500 px-6 py-3 font-bold text-white">Back to products</Link>
      </div>
    )
  }

  if (product.inStock === false) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center">
        <h1 className="text-3xl font-black">Currently unavailable</h1>
        <p className="mt-3 text-slate-600">This item is temporarily out of stock. Please choose another item from our menu.</p>
        <Link to="/product" className="mt-5 inline-block rounded-full bg-orange-500 px-6 py-3 font-bold text-white">Back to products</Link>
      </div>
    )
  }

  const productJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: selectedVariant.gallery ?? [selectedVariant.image],
      description: product.description,
      category: product.category,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: selectedVariant.price,
        availability: 'https://schema.org/InStock',
      },
    },
  ]

  const handleAddToCart = () => {
    addItem(product, selectedSize, quantity)
  }

  const handleBuyNow = () => {
    addItem(product, selectedSize, quantity)
    navigate('/checkout')
  }

  return (
    <div className="space-y-12 pb-10">
      <SEO
        title={`${product.title} | Bun Maska Café`}
        description={product.description}
        canonicalUrl={`/product/${product.slug}`}
        jsonLd={productJsonLd}
      />

      {/* Main Details Section */}
      <section className="grid gap-10 rounded-[2.5rem] bg-white p-6 shadow-sm shadow-slate-200 lg:grid-cols-2 lg:p-10">
        <ProductGallery images={selectedVariant.gallery ?? [selectedVariant.image]} alt={product.title} />

        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-orange-100 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-orange-600">
              {product.category}
            </span>
            
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{product.title}</h1>
            
            {/* Average Rating Score */}
            <div className="flex items-center space-x-2">
              <div className="flex text-amber-400 text-lg">
                {'★'.repeat(Math.round(avgRating))}
              </div>
              <span className="font-extrabold text-slate-900 text-sm">{avgRating} / 5</span>
              <span className="text-xs text-slate-400">({reviews.length} customer reviews)</span>
            </div>

            <p className="text-3xl font-black text-orange-600">{formatPrice(selectedVariant.price)}</p>
            <p className="text-base leading-relaxed text-slate-600">{product.description}</p>
          </div>

          <div className="space-y-6 border-t border-slate-100 pt-6">
            {/* Variants Selector */}
            {product.variants && product.variants.length > 1 && (
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-2">Select Variant</label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.size}
                      onClick={() => setSelectedSize(variant.size)}
                      className={`rounded-2xl border px-5 py-2.5 text-xs font-bold transition ${
                        selectedSize === variant.size
                          ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-200'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300'
                      }`}
                    >
                      {variant.label} ({formatPrice(variant.price)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center space-x-4">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Quantity</label>
              <QuantitySelector quantity={quantity} onDecrease={() => setQuantity((q) => Math.max(1, q - 1))} onIncrease={() => setQuantity((q) => q + 1)} />
            </div>

            {/* Action Buttons */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <button
                onClick={handleAddToCart}
                className="w-full rounded-full border-2 border-orange-500 bg-orange-50 py-3.5 text-sm font-extrabold text-orange-600 transition hover:bg-orange-100 active:scale-95"
              >
                🛒 Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="w-full rounded-full bg-orange-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 active:scale-95"
              >
                ⚡ Order Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS & RATINGS SECTION */}
      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Customer Ratings & Reviews ({reviews.length})</h2>
          <p className="text-xs text-slate-500 mt-1">See what foodies say about {product.title}.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          
          {/* Submit Review Form */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Write a Review</h3>
            
            <form onSubmit={handleAddReview} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Your Rating *</label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setUserRating(star)}
                      className={`text-2xl transition ${star <= userRating ? 'text-amber-400' : 'text-slate-300'}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{userRating} / 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Roy"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Your Feedback / Comment *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="How was the taste, freshness, and delivery?"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {notice && (
                <p className="text-xs font-bold text-emerald-600">{notice}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                Submit Review
              </button>
            </form>
          </div>

          {/* Rendered Reviews List */}
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{rev.name}</span>
                  <span className="text-xs text-slate-400">{rev.date}</span>
                </div>

                <div className="flex text-amber-400 text-sm">
                  {'★'.repeat(rev.rating)}
                  <span className="text-slate-300">{'★'.repeat(5 - rev.rating)}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Related Products */}
      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-3xl font-black text-slate-900">Related products</h2>
          <Link to="/product" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            View all
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {relatedProducts.map((item) => {
            const previewVariant = item.variants?.[0] ?? { image: '', price: 0 }

            return (
              <article key={item.slug} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <img src={previewVariant.image || item.image} alt={item.title} className="h-56 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                    <span className="text-lg font-black text-orange-600">{formatPrice(previewVariant.price || item.price)}</span>
                  </div>
                  <Link to={`/product/${item.slug}`} className="mt-5 inline-block rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600">
                    View product
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
