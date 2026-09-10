import { createSlice } from '@reduxjs/toolkit'

let storedUser = null
try {
  const rawUser = localStorage.getItem('bun-maska-user')
  storedUser = rawUser ? JSON.parse(rawUser) : null
  if (!storedUser || typeof storedUser.email !== 'string') storedUser = null
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
      state.user = action.payload
      state.isAuthenticated = true
      localStorage.setItem('bun-maska-user', JSON.stringify(action.payload))
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