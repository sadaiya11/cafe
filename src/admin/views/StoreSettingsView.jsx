import { useState, useEffect } from 'react'
import {
  getStoreSettings,
  saveStoreSettings,
  getHeroSlides,
  saveHeroSlides,
  fetchStoreSettingsFromServer,
  fetchHeroSlidesFromServer,
  isStoreCurrentlyOpen,
} from '../../services/storeSettingsService'

export default function StoreSettingsView() {
  const [settings, setSettings] = useState(getStoreSettings)
  const [slides, setSlides] = useState(getHeroSlides)
  const [savedNotice, setSavedNotice] = useState('')

  const currentlyOpen = isStoreCurrentlyOpen(settings)

  useEffect(() => {
    fetchStoreSettingsFromServer().then((s) => setSettings(s))
    fetchHeroSlidesFromServer().then((sl) => setSlides(sl))
  }, [])

  // Slide creation state
  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    badge: 'Special',
    image: '',
  })

  // Slide editing state
  const [editingSlide, setEditingSlide] = useState(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const handleSettingChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveSettings = (e) => {
    e.preventDefault()
    saveStoreSettings(settings)
    setSavedNotice('✅ Store settings & rates saved to server successfully!')
    setTimeout(() => setSavedNotice(''), 3000)
  }

  // FileReader & Supabase Storage helper for uploading banner slide images
  const handleImageFileChange = (e, isEditing = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5 MB.')
      return
    }

    setIsUploadingImage(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      try {
        const slideId = isEditing && editingSlide ? editingSlide.id : `slide-${Date.now()}`
        const res = await fetch('/api/db/slide-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${JSON.parse(localStorage.getItem('bun_maska_staff_session') || '{}').token || ''}`,
          },
          body: JSON.stringify({ slideId, image: dataUrl, contentType: file.type || 'image/jpeg' }),
        })
        const data = await res.json()
        const finalUrl = data.imageUrl || dataUrl

        if (isEditing) {
          setEditingSlide((prev) => (prev ? { ...prev, image: finalUrl } : null))
        } else {
          setNewSlide((prev) => ({ ...prev, image: finalUrl }))
        }
      } catch (err) {
        console.warn('Slide image storage upload notice:', err)
        if (isEditing) {
          setEditingSlide((prev) => (prev ? { ...prev, image: dataUrl } : null))
        } else {
          setNewSlide((prev) => ({ ...prev, image: dataUrl }))
        }
      } finally {
        setIsUploadingImage(false)
      }
    }
    reader.readAsDataURL(file)
  }


  const handleAddSlide = (e) => {
    e.preventDefault()
    if (!newSlide.title || !newSlide.subtitle || !newSlide.image) {
      alert('Please fill out all fields and upload an image for the banner slide.')
      return
    }

    const slideObj = {
      id: `slide-${Date.now()}`,
      ...newSlide,
    }

    const updated = [...slides, slideObj]
    setSlides(updated)
    saveHeroSlides(updated)
    setNewSlide({ title: '', subtitle: '', badge: 'Special', image: '' })
    setSavedNotice('🎉 Hero slide added successfully!')
    setTimeout(() => setSavedNotice(''), 3000)
  }

  const handleStartEdit = (slide) => {
    setEditingSlide({ ...slide })
  }

  const handleSaveEditedSlide = (e) => {
    e.preventDefault()
    if (!editingSlide || !editingSlide.title || !editingSlide.subtitle || !editingSlide.image) {
      alert('Please complete all slide fields and provide an image.')
      return
    }

    const updated = slides.map((s) => (s.id === editingSlide.id ? editingSlide : s))
    setSlides(updated)
    saveHeroSlides(updated)
    setEditingSlide(null)
    setSavedNotice('✏️ Banner slide updated successfully!')
    setTimeout(() => setSavedNotice(''), 3000)
  }

  const handleDeleteSlide = (id) => {
    if (!window.confirm('Are you sure you want to delete this hero banner?')) return
    const updated = slides.filter((s) => s.id !== id)
    setSlides(updated)
    saveHeroSlides(updated)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Store Settings & Banner Manager</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Control manual store open/closed toggle, automatic daily operating hours (11:00 AM - 11:30 PM), rates & banners.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-pulse">
          {savedNotice}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-8">

        {/* 1. Store Status & Automatic Operating Hours (11:00 AM - 11:30 PM) */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏬 Store Status (Accepting Online Orders)</span>
              </h3>
              <p className="text-xs text-slate-400">Master override toggle and automatic operating hours scheduler (11:00 AM to 11:30 PM).</p>
            </div>

            <button
              type="button"
              onClick={() => handleSettingChange('isStoreOpen', !settings.isStoreOpen)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${settings.isStoreOpen ? 'bg-emerald-500' : 'bg-rose-600'
                }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.isStoreOpen ? 'translate-x-9' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${currentlyOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
              {currentlyOpen
                ? '🟢 LIVE STATUS: STORE IS OPEN & ACCEPTING ORDERS'
                : !settings.isStoreOpen
                  ? '🛑 LIVE STATUS: MANUALLY CLOSED BY ADMIN'
                  : '🛑 LIVE STATUS: AUTOMATICALLY CLOSED (OUTSIDE OPERATING HOURS)'}
            </span>
          </div>

          {/* Operating Hours Configuration (11:00 AM - 11:30 PM) */}
          <div className="pt-3 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span>⏰ Automatic Store Operating Schedule</span>
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Opening Time (Starts accepting orders)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={settings.openHour ?? 11}
                    onChange={(e) => handleSettingChange('openHour', parseInt(e.target.value))}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {h === 0 ? '12 AM (Midnight)' : h < 12 ? `${h} AM` : h === 12 ? '12 PM (Noon)' : `${h - 12} PM`} ({String(h).padStart(2, '0')}:00)
                      </option>
                    ))}
                  </select>

                  <select
                    value={settings.openMinute ?? 0}
                    onChange={(e) => handleSettingChange('openMinute', parseInt(e.target.value))}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value={0}>:00 Mins</option>
                    <option value={15}>:15 Mins</option>
                    <option value={30}>:30 Mins</option>
                    <option value={45}>:45 Mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Closing Time (Automatically stops orders)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={settings.closeHour ?? 23}
                    onChange={(e) => handleSettingChange('closeHour', parseInt(e.target.value))}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {h === 0 ? '12 AM (Midnight)' : h < 12 ? `${h} AM` : h === 12 ? '12 PM (Noon)' : `${h - 12} PM`} ({String(h).padStart(2, '0')}:00)
                      </option>
                    ))}
                  </select>

                  <select
                    value={settings.closeMinute ?? 30}
                    onChange={(e) => handleSettingChange('closeMinute', parseInt(e.target.value))}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value={0}>:00 Mins</option>
                    <option value={15}>:15 Mins</option>
                    <option value={30}>:30 Mins (11:30 PM)</option>
                    <option value={45}>:45 Mins</option>
                    <option value={59}>:59 Mins</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-300 block">Store Closed Notice Message Shown To Customers</label>
              <input
                type="text"
                value={settings.storeClosedNotice}
                onChange={(e) => handleSettingChange('storeClosedNotice', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="e.g. Our cafe daily operating hours: 11:00 AM - 11:30 PM."
              />
            </div>
          </div>
        </div>

        {/* 2. Financial Rates (Delivery Fee, GST Tax %, Free Delivery Threshold) */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>💳 Financial Rates & Delivery Charges</span>
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Standard Delivery Fee (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.deliveryFee}
                onChange={(e) => handleSettingChange('deliveryFee', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">GST / Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={Math.round((settings.taxRate || 0) * 100)}
                onChange={(e) => handleSettingChange('taxRate', (parseFloat(e.target.value) || 0) / 100)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Free Delivery Minimum (₹)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={settings.freeDeliveryThreshold}
                onChange={(e) => handleSettingChange('freeDeliveryThreshold', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Business Profile & Contact Info */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>📍 Cafe Profile & Public Contact Info</span>
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Store / Brand Name</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => handleSettingChange('storeName', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => handleSettingChange('phone', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Contact Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleSettingChange('email', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Operating Hours</label>
              <input
                type="text"
                value={settings.hours}
                onChange={(e) => handleSettingChange('hours', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleSettingChange('address', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">City & Zip</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={settings.city}
                    onChange={(e) => handleSettingChange('city', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="Zip"
                    value={settings.zip}
                    onChange={(e) => handleSettingChange('zip', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md shadow-amber-500/20"
            >
              💾 Save Store Settings
            </button>
          </div>
        </div>
      </form>

      {/* 4. Homepage Hero Banners Manager */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🖼️ Homepage Hero Banner Slider ({slides.length} Slides)</span>
            </h3>
            <p className="text-xs text-slate-400">Add, edit, or upload images for featured banners on the customer homepage.</p>
          </div>
        </div>

        {/* Existing Slides Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {slides.map((s, idx) => (
            <div key={s.id || idx} className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden space-y-3 p-3 flex flex-col justify-between">
              <div className="space-y-2">
                <img src={s.image} alt={s.title} className="h-32 w-full object-cover rounded-xl border border-slate-800" />
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {s.badge}
                  </span>
                  <h4 className="font-bold text-white text-sm line-clamp-1">{s.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{s.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleStartEdit(s)}
                  className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSlide(s.id)}
                  className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* EDIT SLIDE FORM (When Editing) */}
        {editingSlide ? (
          <form onSubmit={handleSaveEditedSlide} className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">✏️ Editing Hero Banner Slide</h4>
              <button
                type="button"
                onClick={() => setEditingSlide(null)}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ✕ Cancel Edit
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Headline Title *</label>
                <input
                  type="text"
                  required
                  value={editingSlide.title}
                  onChange={(e) => setEditingSlide((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Badge Tag</label>
                <input
                  type="text"
                  value={editingSlide.badge}
                  onChange={(e) => setEditingSlide((p) => ({ ...p, badge: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-300 block mb-1">Sub-headline Description *</label>
                <input
                  type="text"
                  required
                  value={editingSlide.subtitle}
                  onChange={(e) => setEditingSlide((p) => ({ ...p, subtitle: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload Image File or Enter Image URL */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-slate-300 block">Banner Image * (Upload File or Enter URL)</label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>📁 Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileChange(e, true)}
                    />
                  </label>

                  <span className="text-xs text-slate-500">OR</span>

                  <input
                    type="text"
                    placeholder="Paste Image URL (https://...)"
                    value={editingSlide.image}
                    onChange={(e) => setEditingSlide((p) => ({ ...p, image: e.target.value }))}
                    className="flex-1 w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {editingSlide.image && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={editingSlide.image} alt="Preview" className="h-16 w-28 object-cover rounded-xl border border-slate-800" />
                    <span className="text-[11px] text-emerald-400 font-semibold">✓ Image preview ready</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md shadow-amber-500/20"
              >
                💾 Save Changes
              </button>

              <button
                type="button"
                onClick={() => setEditingSlide(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* ADD NEW SLIDE FORM */
          <form onSubmit={handleAddSlide} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">➕ Add New Hero Banner</h4>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Headline Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sizzling Hot Bun Maska & Chai"
                  value={newSlide.title}
                  onChange={(e) => setNewSlide((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Badge Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Special Deal"
                  value={newSlide.badge}
                  onChange={(e) => setNewSlide((p) => ({ ...p, badge: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Sub-headline Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freshly baked bun maska served with piping hot Irani chai."
                  value={newSlide.subtitle}
                  onChange={(e) => setNewSlide((p) => ({ ...p, subtitle: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload Image File or Enter Image URL */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-slate-400 block">Banner Image * (Upload File or Enter URL)</label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>📁 Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileChange(e, false)}
                    />
                  </label>

                  <span className="text-xs text-slate-500">OR</span>

                  <input
                    type="text"
                    placeholder="Paste Image URL (https://...)"
                    value={newSlide.image}
                    onChange={(e) => setNewSlide((p) => ({ ...p, image: e.target.value }))}
                    className="flex-1 w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {newSlide.image && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={newSlide.image} alt="Preview" className="h-16 w-28 object-cover rounded-xl border border-slate-800" />
                    <span className="text-[11px] text-emerald-400 font-semibold">✓ Image preview ready</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md"
            >
              ➕ Add Banner Slide
            </button>
          </form>
        )}
      </div>

    </div>
  )
}
