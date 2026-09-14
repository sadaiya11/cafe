const STAFF_SESSION_KEY = 'bun_maska_staff_session'

export function isStaffAuthenticated() {
  try {
    const session = localStorage.getItem(STAFF_SESSION_KEY)
    if (!session) return false
    const parsed = JSON.parse(session)
    return Boolean(parsed && parsed.authenticated && parsed.token)
  } catch {
    return false
  }
}

export async function logoutStaff() {
  const token = getStaffToken()
  if (token) {
    await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  }
  localStorage.removeItem(STAFF_SESSION_KEY)
  window.dispatchEvent(new Event('bun_staff_auth_changed'))
}

export function getStaffToken() {
  try {
    const session = JSON.parse(localStorage.getItem(STAFF_SESSION_KEY) || 'null')
    return session?.token || null
  } catch {
    return null
  }
}

export function loginStaff(sessionData) {
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(sessionData))
  window.dispatchEvent(new Event('bun_staff_auth_changed'))
}
