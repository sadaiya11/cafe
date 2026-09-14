const STORE_SETTINGS_KEY = 'bun_maska_store_settings'
const HERO_SLIDES_KEY = 'bun_maska_hero_slides'

export const DEFAULT_SETTINGS = {
  isStoreOpen: true,
  storeClosedNotice: 'Our cafe daily operating hours: 11:00 AM - 11:30 PM.',
  deliveryFee: 4.99,
  taxRate: 0.08, // 8% GST/Tax
  freeDeliveryThreshold: 500,
  storeName: 'Bun Maska Café',
  phone: '8085700750',
  email: 'hello@bunmaskacafe.com',
  address: 'Sisodiya Colony, Guna M.P.',
  city: 'Guna, M.P.',
  zip: '473001',
  hours: 'Mon - Sun: 11:00 AM - 11:30 PM',
  openHour: 11, // 11:00 AM
  openMinute: 0,
  closeHour: 23, // 11:30 PM
  closeMinute: 30,
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
  const closeMinute = currentSettings.closeMinute ?? 30

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openMinutesTotal = openHour * 60 + openMinute
  const closeMinutesTotal = closeHour * 60 + closeMinute

  return currentMinutes >= openMinutesTotal && currentMinutes <= closeMinutesTotal
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = `${API_BASE_URL}/api/db`

function staffHeaders() {
  try {
    const session = JSON.parse(localStorage.getItem('bun_maska_staff_session') || 'null')
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
  } catch {
    return {}
  }
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
      zip: parsed.zip || '473001',
      hours: parsed.hours && !parsed.hours.includes('11:59') ? parsed.hours : 'Mon - Sun: 11:00 AM - 11:30 PM',
      openHour: parsed.openHour !== undefined ? parsed.openHour : 11,
      openMinute: parsed.openMinute !== undefined ? parsed.openMinute : 0,
      closeHour: parsed.closeHour !== undefined ? parsed.closeHour : 23,
      closeMinute: parsed.closeMinute !== undefined ? parsed.closeMinute : 30,
      storeClosedNotice: parsed.storeClosedNotice && !parsed.storeClosedNotice.includes('11:59') ? parsed.storeClosedNotice : 'Our cafe daily operating hours: 11:00 AM - 11:30 PM.',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function fetchStoreSettingsFromServer() {
  try {
    const res = await fetch(`${API_BASE}/settings`)
    if (res.ok) {
      const data = await res.json()
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        const merged = { ...DEFAULT_SETTINGS, ...data }
        localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(merged))
        window.dispatchEvent(new Event('bun_store_settings_updated'))
        return merged
      }
    }
  } catch (err) {
    console.warn('Failed to fetch store settings from server:', err)
  }
  return getStoreSettings()
}

export async function saveStoreSettings(settings) {
  try {
    const current = getStoreSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('bun_store_settings_updated'))

    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...staffHeaders() },
      body: JSON.stringify(updated),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.settings) return data.settings
    }

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

export async function fetchHeroSlidesFromServer() {
  try {
    const res = await fetch(`${API_BASE}/slides`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(HERO_SLIDES_KEY, JSON.stringify(data))
        window.dispatchEvent(new Event('bun_hero_slides_updated'))
        return data
      }
    }
  } catch (err) {
    console.warn('Failed to fetch hero slides from server:', err)
  }
  return getHeroSlides()
}

export async function saveHeroSlides(slides) {
  try {
    localStorage.setItem(HERO_SLIDES_KEY, JSON.stringify(slides))
    window.dispatchEvent(new Event('bun_hero_slides_updated'))

    const res = await fetch(`${API_BASE}/slides`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...staffHeaders() },
      body: JSON.stringify(slides),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.slides) return data.slides
    }

    return slides
  } catch (e) {
    console.warn('Failed to save hero slides:', e)
    return DEFAULT_HERO_SLIDES
  }
}

/** Reviews Management */
export function getAllReviews() {
  return []
}

export async function fetchAllReviewsFromServer() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/db/products`)
    if (res.ok) {
      const products = await res.json()
      const allReviews = []
      for (const p of products) {
        if (!p.slug) continue
        try {
          const revRes = await fetch(`${API_BASE_URL}/api/db/reviews?slug=${encodeURIComponent(p.slug)}`)
          if (revRes.ok) {
            const revs = await revRes.json()
            if (Array.isArray(revs)) {
              revs.forEach((r) => allReviews.push({ ...r, productSlug: p.slug }))
            }
          }
        } catch (e) {
          console.warn('DB reviews fetch notice:', e.message)
        }
      }
      return allReviews
    }
  } catch (err) {
    console.warn('Failed to fetch reviews from server DB:', err)
  }
  return []
}

export async function deleteReview(productSlug, reviewId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/db/reviews?slug=${encodeURIComponent(productSlug)}`)
    if (res.ok) {
      const revs = await res.json()
      if (Array.isArray(revs)) {
        const updated = revs.filter((r) => r.id !== reviewId)
        await fetch(`${API_BASE_URL}/api/db/reviews`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...staffHeaders() },
          body: JSON.stringify({ slug: productSlug, reviews: updated }),
        })
        window.dispatchEvent(new Event('bun_reviews_updated'))
      }
    }
  } catch (e) {
    console.warn('Failed to delete review on DB:', e)
  }
}
