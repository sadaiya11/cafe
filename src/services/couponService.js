const STORAGE_KEY = 'bun_maska_coupons';

const defaultCoupons = [
  {
    code: 'BUN20',
    type: 'PERCENT', // 'PERCENT' or 'FLAT'
    value: 20,
    minOrder: 150,
    description: 'Get 20% OFF on orders above ₹150',
    active: true
  },
  {
    code: 'FIRST50',
    type: 'FLAT',
    value: 50,
    minOrder: 200,
    description: 'Flat ₹50 OFF on orders above ₹200',
    active: true
  },
  {
    code: 'FREESHIP',
    type: 'FLAT',
    value: 40,
    minOrder: 100,
    description: 'Free Delivery (Save ₹40)',
    active: true
  }
];

export function getCoupons() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultCoupons;
  } catch {
    return defaultCoupons;
  }
}

export function saveCoupons(coupons) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
}

export function validateCoupon(code, subtotal) {
  if (!code) return { valid: false, message: 'Please enter a coupon code.' };
  
  const coupons = getCoupons();
  const found = coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase() && c.active);

  if (!found) {
    return { valid: false, message: `Invalid coupon code "${code}".` };
  }

  if (subtotal < (found.minOrder || 0)) {
    return { 
      valid: false, 
      message: `Minimum order amount of ₹${found.minOrder} required for ${found.code}.` 
    };
  }

  let discountAmount = 0;
  if (found.type === 'PERCENT') {
    discountAmount = Math.round((subtotal * found.value) / 100);
  } else {
    discountAmount = Number(found.value);
  }

  discountAmount = Math.min(subtotal, discountAmount);

  return {
    valid: true,
    coupon: found,
    discountAmount,
    message: `Coupon "${found.code}" applied! Saved ₹${discountAmount}.`
  };
}
