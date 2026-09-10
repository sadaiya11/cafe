const STORE_SETTINGS_KEY = 'bun_maska_store_settings'
const HERO_SLIDES_KEY = 'bun_maska_hero_slides'

export const DEFAULT_SETTINGS = {
  isStoreOpen: true,
  storeClosedNotice: 'Our cafe is currently closed for online orders. We will re-open soon!',
  deliveryFee: 4.99,
  taxRate: 0.08, // 8% GST/Tax
  freeDeliveryThreshold: 500,
  storeName: 'Bun Maska Café',
  phone: '+91 98765 43210',
  email: 'hello@bunmaskacafe.com',
  address: '123 Irani Cafe Street, Bandra West',
  city: 'Mumbai',
  zip: '400050',
  hours: 'Mon - Sun: 7:00 AM - 11:00 PM',
}

export const DEFAULT_HERO_SLIDES = [
  {
    id: 'slide-1',
    title: 'Fresh taste, made to order.',
    subtitle: 'Chef-crafted wraps, biryanis, grills, and family combos served fresh every day.',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1500&q=80',
    badge: 'Hot Picks',
  },
  {
    id: 'slide-2',
    title: 'Big flavors, amazing value.',
    subtitle: 'Savor our signature deals, all-day combos, and comforting meals for every mood.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1500&q=80',
    badge: 'Weekend Deal',
  },
  {
    id: 'slide-3',
    title: 'Your favorite cafe, delivered fast.',
    subtitle: 'Order online for quick delivery, pickup, and a warm dine-in experience.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1500&q=80',
    badge: 'Fast Delivery',
  },
]

export function getStoreSettings() {
  try {
    const data = localStorage.getItem(STORE_SETTINGS_KEY)
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveStoreSettings(settings) {
  try {
    const current = getStoreSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('bun_store_settings_updated'))
    return updated
  } catch (e) {
    console.warn('Failed to save store settings:', e)
    return DEFAULT_SETTINGS
  }
}

export function getHeroSlides() {
  try {
    const data = localStorage.getItem(HERO_SLIDES_KEY)
    return data ? JSON.parse(data) : DEFAULT_HERO_SLIDES
  } catch {
    return DEFAULT_HERO_SLIDES
  }
}

export function saveHeroSlides(slides) {
  try {
    localStorage.setItem(HERO_SLIDES_KEY, JSON.stringify(slides))
    window.dispatchEvent(new Event('bun_hero_slides_updated'))
    return slides
  } catch (e) {
    console.warn('Failed to save hero slides:', e)
    return DEFAULT_HERO_SLIDES
  }
}

/** Reviews Management */
export function getAllReviews() {
  const allReviews = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('bun_maska_reviews_')) {
        const slug = key.replace('bun_maska_reviews_', '')
        const reviews = JSON.parse(localStorage.getItem(key) || '[]')
        reviews.forEach((r) => {
          allReviews.push({ ...r, productSlug: slug })
        })
      }
    }
  } catch (e) {
    console.warn('Failed to fetch reviews:', e)
  }
  return allReviews
}

export function deleteReview(productSlug, reviewId) {
  try {
    const key = `bun_maska_reviews_${productSlug}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const reviews = JSON.parse(stored).filter((r) => r.id !== reviewId)
      localStorage.setItem(key, JSON.stringify(reviews))
      window.dispatchEvent(new Event('bun_reviews_updated'))
    }
  } catch (e) {
    console.warn('Failed to delete review:', e)
  }
}
