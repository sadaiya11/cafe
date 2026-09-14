const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const defaultCoupons = [
  {
    code: 'BUN20',
    type: 'PERCENT', // 'PERCENT' or 'FLAT'
    value: 20,
    minOrder: 150,
    description: 'Get 20% OFF on orders above ₹150',
    active: true,
  },
  {
    code: 'FIRST50',
    type: 'FLAT',
    value: 50,
    minOrder: 200,
    description: 'Flat ₹50 OFF on orders above ₹200',
    active: true,
  },
  {
    code: 'FREESHIP',
    type: 'FLAT',
    value: 40,
    minOrder: 100,
    description: 'Free Delivery (Save ₹40)',
    active: true,
  },
]

let cachedCoupons = null

function authHeaders() {
  try {
    const session = JSON.parse(localStorage.getItem('bun_maska_staff_session') || 'null')
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
  } catch {
    return {}
  }
}

export async function fetchCoupons() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/db/coupons`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        cachedCoupons = data
        return data
      }
    }
  } catch (e) {
    console.warn('DB coupons fetch notice:', e.message)
  }
  return cachedCoupons || defaultCoupons
}

export function getCoupons() {
  if (!cachedCoupons) {
    fetchCoupons()
  }
  return cachedCoupons || defaultCoupons
}

export async function saveCoupons(coupons) {
  cachedCoupons = coupons
  try {
    const res = await fetch(`${API_BASE_URL}/api/db/coupons`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(coupons),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.coupons) cachedCoupons = data.coupons
      return cachedCoupons
    }
  } catch (e) {
    console.warn('DB coupons save notice:', e.message)
  }
  return coupons
}

export async function validateCoupon(code, subtotal) {
  if (!code) return { valid: false, message: 'Please enter a coupon code.' }

  const coupons = await fetchCoupons()
  const found = coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase() && c.active)

  if (!found) {
    return { valid: false, message: `Invalid coupon code "${code}".` }
  }

  if (subtotal < (found.minOrder || 0)) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${found.minOrder} required for ${found.code}.`,
    }
  }

  const rawDiscount = found.type === 'PERCENT'
    ? Math.round((subtotal * found.value) / 100)
    : Number(found.value)
  const discountAmount = Math.min(subtotal, rawDiscount)

  return {
    valid: true,
    coupon: found,
    discountAmount,
    message: `Coupon "${found.code}" applied! Saved ₹${discountAmount}.`,
  }
}
