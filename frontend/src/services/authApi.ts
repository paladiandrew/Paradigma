import api, { tokenStorage } from './api'
import type { User } from '../types/auth'

type LoginPayload = {
  login: string
  password: string
}

type RegisterPayload = {
  username: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  password: string
}

export const authApi = {
  async login(payload: LoginPayload) {
    const response = await api.post('/auth/login', {
      login: payload.login,
      password: payload.password,
    })
    return response.data as { access_token?: string }
  },
  async register(payload: RegisterPayload) {
    const { phone, ...rest } = payload
    const body = { ...rest, ...(phone?.trim() ? { phone: phone.trim() } : {}) }
    const response = await api.post('/auth/register', body)
    return response.data as User
  },
  async me() {
    const response = await api.get('/auth/me')
    return response.data as User
  },
  async logout() {
    await api.post('/auth/logout')
    tokenStorage.clear()
  },
  async updateProfile(userId: string, payload: Partial<User>) {
    const response = await api.put(`/users/${userId}`, payload)
    return response.data as User
  },
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    await api.post(`/users/${userId}/change-password`, { old_password: oldPassword, new_password: newPassword })
  },
}
