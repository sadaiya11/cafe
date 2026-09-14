import { useState, useEffect, useMemo } from 'react'
import { fetchAdminUsers, updateUserLoginPermission, deleteAdminUser, registerStaffMember } from '../services/adminApi'

export default function StaffManagerView() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [notice, setNotice] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // New staff form state
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'STAFF',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    const data = await fetchAdminUsers()
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // The staff directory must never expose admin accounts to staff actions.
  const staffMembers = useMemo(() => {
    return users.filter((u) => String(u.role || '').toUpperCase() === 'STAFF')
  }, [users])

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return staffMembers
    const q = searchTerm.trim().toLowerCase()
    return staffMembers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    )
  }, [staffMembers, searchTerm])

  const stats = useMemo(() => {
    const total = staffMembers.length
    const active = staffMembers.filter((s) => s.isAllowedLogin !== false).length
    const disabled = total - active
    return { total, active, disabled }
  }, [staffMembers])

  const handleToggleLogin = async (staff) => {
    const newPermission = staff.isAllowedLogin === false ? true : false
    const actionText = newPermission ? 'enabled' : 'disabled'
    
    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === staff.id ? { ...u, isAllowedLogin: newPermission } : u))
    )

    const res = await updateUserLoginPermission(staff.id, newPermission)
    if (res.success) {
      setNotice(`Login permission ${actionText} for ${staff.name}`)
    } else {
      setNotice(res.error || 'Failed to update login permission.')
      loadUsers() // Revert
    }

    setTimeout(() => setNotice(''), 3500)
  }

  const handleDeleteStaff = async (staffId) => {
    const res = await deleteAdminUser(staffId)
    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== staffId))
      setNotice('Staff member unregistered and deleted successfully.')
    } else {
      setNotice(res.error || 'Failed to delete staff member.')
    }
    setDeleteConfirmId(null)
    setTimeout(() => setNotice(''), 3500)
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!newStaff.name.trim() || !newStaff.email.trim() || !newStaff.password.trim()) {
      setFormError('Name, email, and password are required.')
      return
    }

    setIsSubmitting(true)
    const res = await registerStaffMember(newStaff)
    setIsSubmitting(false)

    if (res.success) {
      setShowAddModal(false)
      setNewStaff({ name: '', email: '', password: '', phone: '', role: 'STAFF' })
      setNotice(`Staff member ${newStaff.name} registered successfully!`)
      loadUsers()
      setTimeout(() => setNotice(''), 3500)
    } else {
      setFormError(res.error || 'Failed to register staff member.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Staff Directory & Access Permissions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage staff accounts, enable/disable login access permissions, register new staff, or delete staff profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
        >
          ➕ Register New Staff
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-fade-in">
          {notice}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Staff</div>
          <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Active Login</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.active}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Access Disabled</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{stats.disabled}</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search staff by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Staff Table / Cards */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400">Loading staff directory...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="text-base font-bold text-slate-300">No Staff Members Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm ? 'No staff match your search criteria.' : 'Click "Register New Staff" above to create staff accounts.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredStaff.map((staff) => {
            const isAllowed = staff.isAllowedLogin !== false
            const roleName = String(staff.role || 'STAFF').toUpperCase()

            return (
              <div
                key={staff.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-sm">
                        {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{staff.name}</h4>
                        <span className="text-[11px] text-slate-400 block font-mono">{staff.email}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                        roleName === 'ADMIN'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {roleName}
                    </span>
                  </div>

                  {staff.phone && (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span>📞 Phone:</span>
                      <span className="font-mono text-slate-300">{staff.phone}</span>
                    </div>
                  )}

                  {/* Permission Badge */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Login Permission:</span>
                    {isAllowed ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Allowed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span> Disabled
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleToggleLogin(staff)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      isAllowed
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {isAllowed ? '🔒 Disable Login' : '🔓 Allow Login'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(staff.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    🗑️ Delete Staff
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Unregister Staff Member?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete and unregister this staff account? They will no longer be able to sign in to the cafe app.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStaff(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Register New Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="staff@bunmaska.in"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 4 characters"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Staff Role</label>
                <input
                  type="text"
                  value="Staff (POS / Order Manager)"
                  readOnly
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting ? 'Registering...' : 'Register Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
