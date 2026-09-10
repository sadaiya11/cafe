import { useState, useEffect } from 'react'
import { getAllReviews, deleteReview } from '../../services/storeSettingsService'

export default function ReviewsManagerView() {
  const [reviews, setReviews] = useState(getAllReviews)
  const [notice, setNotice] = useState('')

  const refresh = () => {
    setReviews(getAllReviews())
  }

  useEffect(() => {
    refresh()
    window.addEventListener('bun_reviews_updated', refresh)
    return () => window.removeEventListener('bun_reviews_updated', refresh)
  }, [])

  const handleDelete = (productSlug, id) => {
    deleteReview(productSlug, id)
    setNotice('Review deleted successfully.')
    refresh()
    setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Customer Food Reviews Moderation</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Monitor customer feedback, star ratings, and remove inappropriate or spam reviews.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          {notice}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
          <div className="text-4xl mb-3">⭐</div>
          <h3 className="text-base font-bold text-slate-300">No Reviews Submitted Yet</h3>
          <p className="text-xs text-slate-500 mt-1">Customer reviews posted on product detail pages will appear here for moderation.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((rev, idx) => (
            <div key={rev.id || idx} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm">{rev.name}</span>
                  <span className="text-[11px] text-amber-400 block font-mono">Product: /{rev.productSlug}</span>
                </div>
                <span className="text-xs text-slate-500">{rev.date || 'Recently'}</span>
              </div>

              <div className="flex text-amber-400 text-sm">
                {'★'.repeat(rev.rating)}
                <span className="text-slate-700">{'★'.repeat(5 - rev.rating)}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                "{rev.comment}"
              </p>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleDelete(rev.productSlug, rev.id)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition"
                >
                  🗑️ Delete Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
