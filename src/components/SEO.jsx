import { useEffect } from 'react'

export default function SEO({
  title,
  description = 'Bun Maska Café - Fresh artisanal breads, Irani chai, gourmet coffee, and delicious snacks prepared fresh for you.',
  keywords = 'bun maska, cafe, irani chai, coffee, bakery, snacks, online food order, restaurant, breakfast',
  canonical,
  ogImage = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
  ogType = 'website',
  noindex = false,
  jsonLd = null,
}) {
  useEffect(() => {
    const siteName = 'Bun Maska Café'
    const fullTitle = title ? (title.includes(siteName) ? title : `${title} | ${siteName}`) : `${siteName} - Fresh Breads, Chai & Gourmet Coffee`
    document.title = fullTitle

    const setMetaTag = (selector, attributeName, attributeValue, content) => {
      if (!content) return
      let element = document.querySelector(selector)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attributeName, attributeValue)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    const setCanonicalLink = (url) => {
      let link = document.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', url || window.location.href)
    }

    // Standard Meta Tags
    setMetaTag('meta[name="description"]', 'name', 'description', description)
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywords)
    setMetaTag('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')

    // OpenGraph Meta Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle)
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description)
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage)
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType)
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonical || window.location.href)
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', siteName)

    // Twitter Cards
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle)
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage)

    // Canonical Tag
    setCanonicalLink(canonical || window.location.href)

    // JSON-LD Structured Data
    let scriptTag = document.querySelector('#seo-json-ld')
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script')
        scriptTag.id = 'seo-json-ld'
        scriptTag.type = 'application/ld+json'
        document.head.appendChild(scriptTag)
      }
      scriptTag.textContent = JSON.stringify(jsonLd)
    } else if (scriptTag) {
      scriptTag.remove()
    }
  }, [title, description, keywords, canonical, ogImage, ogType, noindex, jsonLd])

  return null
}
