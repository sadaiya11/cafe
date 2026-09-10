const STAFF_SESSION_KEY = 'bun_maska_staff_session'

export function isStaffAuthenticated() {
  try {
    const session = localStorage.getItem(STAFF_SESSION_KEY)
    if (!session) return false
    const parsed = JSON.parse(session)
    return Boolean(parsed && parsed.authenticated)
  } catch {
    return false
  }
}

export function logoutStaff() {
  localStorage.removeItem(STAFF_SESSION_KEY)
  window.dispatchEvent(new Event('bun_staff_auth_changed'))
}

export function loginStaff(sessionData) {
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(sessionData))
  window.dispatchEvent(new Event('bun_staff_auth_changed'))
}
