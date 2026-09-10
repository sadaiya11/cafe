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
    "id": "slide-1",
    "title": "Classic Taste • Premium Maska",
    "subtitle": "Freshly grilled Bun Maska, Nutella Bun Maska, and Rabdi Bun Maska made with love.",
    "image": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1500&q=80",
    "badge": "Signature Buns"
  },
  {
    "id": "slide-2",
    "title": "Maggi, Momos & Loaded Fries",
    "subtitle": "Tadka Maggi, Cheese Peri Peri Fries, and Crispy Momos for every hunger craving.",
    "image": "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=1500&q=80",
    "badge": "Har Bite Me Maska"
  },
  {
    "id": "slide-3",
    "title": "Maska Loaded Sandwiches",
    "subtitle": "Double-decker loaded sandwiches packed with fresh veggies, extra cheese & signature butter.",
    "image": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1500&q=80",
    "badge": "Chef Special"
  }
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
