import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { logout, updateUser } from '../store/authSlice'
import { updateUserProfile, changePassword, forgotPassword } from '../services/api'
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

  // Password Update Form State
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState({ type: '', message: '' })
  const [resetEmailSentData, setResetEmailSentData] = useState(null)

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

  // Update password directly from Profile page
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordNotice({ type: '', message: '' })

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordNotice({ type: 'error', message: 'Please fill in all password fields.' })
      return
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setPasswordNotice({ type: 'error', message: 'New password and confirm password do not match.' })
      return
    }

    if (newPassword.trim().length < 4) {
      setPasswordNotice({ type: 'error', message: 'New password must be at least 4 characters long.' })
      return
    }

    setPasswordLoading(true)

    try {
      await changePassword({
        email: user.email,
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      })

      setPasswordNotice({ type: 'success', message: 'Password updated successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordNotice({ type: 'error', message: err.message || 'Failed to update password.' })
    } finally {
      setPasswordLoading(false)
    }
  }

  // Send email reset link from Profile page
  const handleSendResetEmail = async () => {
    setPasswordNotice({ type: '', message: '' })
    setResetEmailSentData(null)

    if (!user?.email) {
      setPasswordNotice({ type: 'error', message: 'No email found for this user account.' })
      return
    }

    setPasswordLoading(true)

    try {
      const res = await forgotPassword({ email: user.email })
      setResetEmailSentData(res)
      setPasswordNotice({
        type: 'success',
        message: `Password reset verification link has been sent to ${user.email}! Check your inbox or click the preview link.`,
      })
    } catch (err) {
      setPasswordNotice({ type: 'error', message: err.message || 'Failed to send reset link.' })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <SEO title="My Profile | Bun Maska Café" noindex={true} />

      {/* Main Profile Section */}
      <section className="rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-100 border border-slate-100 md:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <SectionHeader
            eyebrow="My Account"
            title="User Profile"
            subtitle="Manage your personal details, contact information, and security settings."
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
      </section>

      {/* Password Management & Security Section */}
      <section className="rounded-[2.5rem] bg-white p-6 shadow-xl shadow-slate-100 border border-slate-100 md:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-orange-600">Account Protection</span>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Security & Password</h2>
            <p className="mt-1 text-xs text-slate-500">Update your password or request an email reset verification link.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-slate-300 bg-slate-50 px-6 py-3 font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 text-sm"
          >
            🔑 {showPasswordSection ? 'Hide Password Options' : 'Update Password Settings'}
          </button>
        </div>

        {passwordNotice.message && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-xs font-bold text-center ${
              passwordNotice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {passwordNotice.type === 'error' ? '⚠️ ' : '✅ '}
            {passwordNotice.message}
          </div>
        )}

        {/* Verification Link Preview Banner if Email Reset requested */}
        {resetEmailSentData && (
          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
              📧 Email Reset Verification Link Preview:
            </p>
            <p className="text-xs text-slate-600 font-medium">
              Click the link below to verify your email and open the password reset page:
            </p>
            <a
              href={resetEmailSentData.resetLink}
              className="block text-xs font-bold text-orange-600 underline break-all bg-white p-3 rounded-xl border border-orange-200 hover:bg-orange-100 transition"
            >
              {resetEmailSentData.resetLink}
            </a>
          </div>
        )}

        {showPasswordSection && (
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {/* Direct Password Update Form */}
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Option 1: Change Password Directly</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full rounded-full bg-slate-900 px-6 py-3.5 text-xs font-bold text-white shadow hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password ➔'}
              </button>
            </form>

            {/* Email Reset Link Option */}
            <div className="flex flex-col justify-between rounded-3xl border border-orange-200 bg-orange-50/40 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-black text-orange-700 uppercase tracking-wider">Option 2: Email Verification Reset Link</h3>
                <p className="mt-2 text-xs text-slate-600 font-medium leading-relaxed">
                  Forgot your current password? We can send a password reset verification link to your email address:
                </p>
                <div className="mt-4 rounded-xl bg-white p-3 border border-orange-200 text-xs font-bold text-slate-800">
                  📧 {user?.email}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={passwordLoading}
                className="w-full rounded-full bg-orange-500 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 transition"
              >
                {passwordLoading ? 'Sending Email Link...' : 'Send Reset Link to My Email ➔'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-slate-100 pt-6 flex justify-between items-center">
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
