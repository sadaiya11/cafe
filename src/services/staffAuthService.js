const STAFF_SESSION_KEY = 'bun_maska_staff_session'
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours minimum

export function isStaffAuthenticated() {
  try {
    const sessionStr = localStorage.getItem(STAFF_SESSION_KEY)
    if (!sessionStr) return false
    const parsed = JSON.parse(sessionStr)
    if (!parsed || !parsed.authenticated || !parsed.token) return false

    if (parsed.loginTime) {
      const elapsed = Date.now() - new Date(parsed.loginTime).getTime()
      if (elapsed > SESSION_MAX_AGE_MS) {
        localStorage.removeItem(STAFF_SESSION_KEY)
        window.dispatchEvent(new Event('bun_staff_auth_changed'))
        return false
      }
    }
    return true
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
  const dataToSave = {
    ...sessionData,
    loginTime: sessionData.loginTime || new Date().toISOString(),
  }
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(dataToSave))
  window.dispatchEvent(new Event('bun_staff_auth_changed'))
}

export function handleStaffResponse(response) {
  if (response && (response.status === 401 || response.status === 403)) {
    logoutStaff()
  }
  return response
}
