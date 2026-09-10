import { useEffect, useMemo, useState } from 'react'
import CartContext from './cart-context'
import { getStoreSettings } from '../services/storeSettingsService'

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [storeSettings, setStoreSettings] = useState(getStoreSettings)

  useEffect(() => {
    const handleUpdate = () => setStoreSettings(getStoreSettings())
    window.addEventListener('bun_store_settings_updated', handleUpdate)
    return () => window.removeEventListener('bun_store_settings_updated', handleUpdate)
  }, [])

  const addItem = (product, variant, quantity = 1) => {
    setItems((currentItems) => {
      let variantObj = null
      if (typeof variant === 'object' && variant !== null) {
        variantObj = variant
      } else if (Array.isArray(product.variants) && product.variants.length > 0) {
        variantObj = product.variants.find((v) => v.size === variant) || product.variants[0]
      }

      const size = variantObj?.size || (typeof variant === 'string' ? variant : 'standard')
      const rawSizeLabel = variantObj?.label || variantObj?.name || (typeof variant === 'string' ? variant : '')
      const sizeLabel = rawSizeLabel && rawSizeLabel.toLowerCase() !== 'small' && rawSizeLabel.toLowerCase() !== 'standard' ? rawSizeLabel : ''
      
      const price = Number(variantObj?.price ?? product.price ?? product.variants?.[0]?.price ?? 0)
      const image = variantObj?.image || product.image || ''
      const title = product.title || product.name || 'Food Item'

      const itemKey = `${product.slug || product.id || title}-${size}`
      const existingItem = currentItems.find((item) => item.key === itemKey)

      if (existingItem) {
        return currentItems.map((item) =>
          item.key === itemKey ? { ...item, quantity: item.quantity + quantity } : item,
        )
      }

      return [
        ...currentItems,
        {
          key: itemKey,
          slug: product.slug || product.id,
          title,
          category: product.category,
          size,
          sizeLabel,
          price: isNaN(price) ? 0 : price,
          image,
          quantity,
        },
      ]
    })
  }

  const updateQuantity = (key, quantity) => {
    setItems((currentItems) =>
      quantity < 1
        ? currentItems.filter((item) => item.key !== key)
        : currentItems.map((item) => (item.key === key ? { ...item, quantity } : item)),
    )
  }

  const removeItem = (key) => updateQuantity(key, 0)
  const clearCart = () => setItems([])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0)
    const baseDeliveryFee = Number(storeSettings.deliveryFee ?? 4.99)
    const freeThreshold = Number(storeSettings.freeDeliveryThreshold ?? 500)
    const isFreeDelivery = freeThreshold > 0 && subtotal >= freeThreshold
    const delivery = items.length ? (isFreeDelivery ? 0 : baseDeliveryFee) : 0
    const taxRate = Number(storeSettings.taxRate ?? 0.08)
    const tax = subtotal * taxRate

    return {
      subtotal,
      delivery,
      tax,
      taxRate,
      isFreeDelivery,
      freeDeliveryThreshold: freeThreshold,
      total: subtotal + delivery + tax,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    }
  }, [items, storeSettings])

  const value = { items, addItem, updateQuantity, removeItem, clearCart, storeSettings, ...totals }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export { useCart } from './useCart'
