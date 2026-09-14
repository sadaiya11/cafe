import { createSlice } from '@reduxjs/toolkit'

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours minimum

let storedUser = null
try {
  const rawUser = localStorage.getItem('bun-maska-user')
  storedUser = rawUser ? JSON.parse(rawUser) : null
  if (!storedUser || typeof storedUser.email !== 'string') {
    storedUser = null
  } else if (storedUser.loginTime) {
    const elapsed = Date.now() - new Date(storedUser.loginTime).getTime()
    if (elapsed > SESSION_MAX_AGE_MS) {
      storedUser = null
      localStorage.removeItem('bun-maska-user')
    }
  }
} catch {
  localStorage.removeItem('bun-maska-user')
}

const initialState = {
  user: storedUser,
  isAuthenticated: Boolean(storedUser),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action) => {
      const userPayload = {
        ...action.payload,
        loginTime: action.payload?.loginTime || new Date().toISOString(),
      }
      state.user = userPayload
      state.isAuthenticated = true
      localStorage.setItem('bun-maska-user', JSON.stringify(userPayload))
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        localStorage.setItem('bun-maska-user', JSON.stringify(state.user))
      }
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      localStorage.removeItem('bun-maska-user')
    },
  },
})

export const { login, updateUser, logout } = authSlice.actions
export default authSlice.reducer