export type UserRole = 'user' | 'admin' | 'trainer'

export interface User {
  id: string
  username?: string | null
  email?: string | null
  phone: string
  first_name?: string | null
  last_name?: string | null
  role: UserRole
  specialty?: string | null
  trainer_bio?: string | null
  show_on_homepage?: boolean
  avatar_url?: string | null
  is_email_verified: boolean
  is_phone_verified: boolean
  active_subscription_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  /** Проверка токена /auth/me при старте приложения */
  isSessionLoading: boolean
  /** Активный вход или регистрация */
  isAuthBusy: boolean
  error: string | null
}
