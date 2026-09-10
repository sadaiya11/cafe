import SEO from '../components/SEO'
import { getStoreSettings } from '../services/storeSettingsService'

export default function InfoPage({ title, description }) {
  const store = getStoreSettings()

  return (
    <div className="rounded-3xl bg-white p-8 md:p-12 shadow-sm shadow-slate-200 space-y-6">
      <SEO title={`${title} | ${store.storeName}`} description={description} />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">{store.storeName}</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-black text-slate-900">{title}</h1>
        <p className="mt-3 max-w-xl text-base text-slate-600 leading-relaxed">{description}</p>
      </div>

      {(title === 'Contact' || title === 'About Us' || title === 'About') && (
        <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-slate-100">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">📍 Physical Address & Location</h3>
            <p className="text-sm text-slate-600">{store.address}</p>
            <p className="text-sm text-slate-600">{store.city} - {store.zip}</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">📞 Phone & Email Support</h3>
            <p className="text-sm text-slate-600">Phone: <a href={`tel:${store.phone}`} className="text-orange-600 font-bold underline">{store.phone}</a></p>
            <p className="text-sm text-slate-600">Email: <a href={`mailto:${store.email}`} className="text-orange-600 underline">{store.email}</a></p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-900">⏰ Operating Hours</h3>
            <p className="text-sm text-slate-600">{store.hours}</p>
          </div>
        </div>
      )}
    </div>
  )
}
