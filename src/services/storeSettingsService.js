const STORE_SETTINGS_KEY = 'bun_maska_store_settings'
const HERO_SLIDES_KEY = 'bun_maska_hero_slides'

export const DEFAULT_SETTINGS = {
  isStoreOpen: true,
  storeClosedNotice: 'Our cafe is currently closed for online orders. Daily operating hours: 11:00 AM - 11:59 PM.',
  deliveryFee: 4.99,
  taxRate: 0.08, // 8% GST/Tax
  freeDeliveryThreshold: 500,
  storeName: 'Bun Maska Café',
  phone: '8085700750',
  email: 'hello@bunmaskacafe.com',
  address: 'Sisodiya Colony, Guna M.P.',
  city: 'Guna, M.P.',
  zip: '473002',
  hours: 'Mon - Sun: 11:00 AM - 11:59 PM',
  openHour: 11, // 11:00 AM
  openMinute: 0,
  closeHour: 23, // 11:59 PM
  closeMinute: 59,
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

/** Check real-time store operating status based on current local time & settings */
export function isStoreCurrentlyOpen(settings) {
  const currentSettings = settings || getStoreSettings()
  
  // If store owner manually toggled store closed in Admin settings, respect manual toggle!
  if (currentSettings.isStoreOpen === false) {
    return false
  }

  const openHour = currentSettings.openHour ?? 11
  const openMinute = currentSettings.openMinute ?? 0
  const closeHour = currentSettings.closeHour ?? 23
  const closeMinute = currentSettings.closeMinute ?? 59

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openMinutesTotal = openHour * 60 + openMinute
  const closeMinutesTotal = closeHour * 60 + closeMinute

  return currentMinutes >= openMinutesTotal && currentMinutes <= closeMinutesTotal
}

export function getStoreSettings() {
  try {
    const data = localStorage.getItem(STORE_SETTINGS_KEY)
    if (!data) return DEFAULT_SETTINGS
    const parsed = JSON.parse(data)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      phone: parsed.phone && parsed.phone !== '+91 98765 43210' ? parsed.phone : '8085700750',
      address: parsed.address && !parsed.address.includes('123 Irani') ? parsed.address : 'Sisodiya Colony, Guna M.P.',
      city: parsed.city || 'Guna, M.P.',
      zip: parsed.zip || '473002',
      hours: parsed.hours || 'Mon - Sun: 11:00 AM - 11:59 PM',
    }
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
