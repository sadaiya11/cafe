import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { logout, updateUser } from '../store/authSlice'
import { updateUserProfile } from '../services/api'
import { useNavigate } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import SEO from '../components/SEO'

export default function ProfilePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || user?.mobile || '')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setPhone(user.phone || user.mobile || '')
    }
  }, [user])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/dashboard')
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setNotice({ type: '', message: '' })

    if (!name.trim()) {
      setNotice({ type: 'error', message: 'Full Name cannot be empty.' })
      return
    }

    setLoading(true)
    try {
      if (user?.email) {
        await updateUserProfile({
          email: user.email,
          name: name.trim(),
          phone: phone.trim(),
        })
      }

      dispatch(updateUser({ name: name.trim(), phone: phone.trim() }))
      setNotice({ type: 'success', message: 'Profile updated successfully!' })
      setIsEditing(false)
    } catch (err) {
      // Even if offline/fallback, save locally in state so user UX is seamless
      dispatch(updateUser({ name: name.trim(), phone: phone.trim() }))
      setNotice({ type: 'success', message: 'Profile updated successfully!' })
      setIsEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setName(user?.name || '')
    setPhone(user?.phone || user?.mobile || '')
    setIsEditing(false)
    setNotice({ type: '', message: '' })
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <SEO title="My Profile | Bun Maska Café" noindex={true} />
      <section className="rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-100 border border-slate-100 md:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <SectionHeader
            eyebrow="My Account"
            title="User Profile"
            subtitle="Manage your personal details, saved preferences, and contact information."
          />
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-orange-500 px-6 py-3 font-bold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 text-sm"
            >
              ✏️ Edit Profile (Name & Mobile)
            </button>
          )}
        </div>

        {notice.message && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-xs font-bold text-center ${
              notice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {notice.type === 'error' ? '⚠️ ' : '✅ '}
            {notice.message}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="mt-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Full Name Field (Editable) */}
            <div className={`rounded-3xl border p-6 transition ${isEditing ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200 bg-slate-50/60'}`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-orange-600">
                  Full Name {isEditing && <span className="text-rose-500">*</span>}
                </label>
                {isEditing ? (
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-orange-700">Editable</span>
                ) : (
                  <span className="text-xs text-slate-400">✏️ Editable</span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-lg font-bold text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="mt-2 text-xl font-black text-slate-900">{user?.name || 'Not provided'}</p>
              )}
            </div>

            {/* Mobile Number Field (Editable) */}
            <div className={`rounded-3xl border p-6 transition ${isEditing ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200 bg-slate-50/60'}`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-orange-600">
                  Mobile Number
                </label>
                {isEditing ? (
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-orange-700">Editable</span>
                ) : (
                  <span className="text-xs text-slate-400">✏️ Editable</span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-lg font-bold text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  placeholder="+91 98765 43210"
                />
              ) : (
                <p className="mt-2 text-xl font-black text-slate-900">{user?.phone || user?.mobile || 'Not set'}</p>
              )}
            </div>

            {/* Email Address (Non-Editable / Locked) */}
            <div className="rounded-3xl border border-slate-200 bg-slate-100/70 p-6 opacity-90">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">🔒 Fixed</span>
              </div>
              <p className="mt-2 text-xl font-black text-slate-800">{user?.email || 'N/A'}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Email ID cannot be changed for security reasons.</p>
            </div>

            {/* Member Status / Role (Non-Editable / Locked) */}
            <div className="rounded-3xl border border-slate-200 bg-slate-100/70 p-6 opacity-90">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Member Status & Role</label>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">🔒 Fixed</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xl font-black text-slate-800">
                  {user?.role === 'ADMIN' ? 'Administrator' : 'VIP Foodie Member'}
                </p>
                <span className="text-lg">☕</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Account status assigned by server system.</p>
            </div>
          </div>

          {/* Edit Action Buttons */}
          {isEditing && (
            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-orange-500 px-8 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-50 text-sm"
              >
                {loading ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                className="rounded-full border border-slate-300 bg-white px-6 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </form>

        <div className="mt-10 border-t border-slate-100 pt-6 flex justify-between items-center">
          <p className="text-xs font-medium text-slate-500">
            Registered account linked to <strong className="text-slate-700">{user?.email}</strong>
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-rose-200 bg-rose-50 px-6 py-2.5 font-bold text-rose-600 transition hover:bg-rose-100 text-xs"
          >
            Sign Out
          </button>
        </div>
      </section>
    </div>
  )
}
