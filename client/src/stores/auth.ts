import { reactive, computed } from 'vue'
import * as api from '../api/client'

interface AuthState {
  token: string | null
}

const state = reactive<AuthState>({
  token: localStorage.getItem('auth_token'),
})

export function useAuth() {
  const isAuthenticated = computed(() => !!state.token)

  async function loginUser(email: string, password: string) {
    const result = await api.login(email, password)
    state.token = result.token
    localStorage.setItem('auth_token', result.token)
    localStorage.removeItem('guest_token')
    return result
  }

  async function logoutUser() {
    try {
      await api.logout()
    } finally {
      state.token = null
      localStorage.removeItem('auth_token')
    }
  }

  async function registerUser(email: string, password: string) {
    return api.register(email, password)
  }

  return {
    state,
    isAuthenticated,
    login: loginUser,
    logout: logoutUser,
    register: registerUser,
  }
}
