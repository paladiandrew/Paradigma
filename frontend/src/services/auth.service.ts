import api from './api'
import Cookies from 'js-cookie'
import type { User, RegisterData, LoginData } from '../types/user'

export type { User, RegisterData, LoginData }

export const authService = {
  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  async login(data: LoginData) {
    const response = await api.post('/auth/login', data)
    Cookies.set('access_token', response.data.access_token, { expires: 30 })
    return response.data
  },

  async adminLogin(data: LoginData) {
    const response = await api.post('/auth/admin/login', data)
    Cookies.set('access_token', response.data.access_token, { expires: 30 })
    return response.data
  },

  async logout() {
    await api.post('/auth/logout')
    Cookies.remove('access_token')
  },

  async getMe(): Promise<User> {
    const response = await api.get('/auth/me')
    return response.data
  },

  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirm: string) {
    const response = await api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    })
    return response.data
  },
}
