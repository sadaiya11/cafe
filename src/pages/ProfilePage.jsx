import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { useNavigate } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
import SEO from '../components/SEO'

export default function ProfilePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/dashboard')
  }

  return (
    <div className="space-y-8">
      <SEO title="My Profile | Bun Maska Café" noindex={true} />
      <section className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 md:p-8">
        <SectionHeader
          eyebrow="My Account"
          title="User Profile"
          subtitle="Manage your personal details, saved preferences, and account settings."
        />

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Full Name</p>
            <p className="mt-2 text-xl font-black text-slate-900">{user?.name || 'Maya Reynolds'}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Email Address</p>
            <p className="mt-2 text-xl font-black text-slate-900">{user?.email || 'admin@bunmaska.com'}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Member Status</p>
            <p className="mt-2 text-xl font-black text-slate-900">VIP Foodie Member ☕</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Default Phone</p>
            <p className="mt-2 text-xl font-black text-slate-900">+91 98765 43210</p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
          >
            Sign Out of Account
          </button>
        </div>
      </section>
    </div>
  )
}
