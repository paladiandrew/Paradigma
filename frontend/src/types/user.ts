export type User = {
  id: string
  phone: string
  phone_verified: boolean
  email?: string
  email_verified: boolean
  first_name?: string
  last_name?: string
  role: string
  avatar_url?: string
  created_at: string
}

export type RegisterData = {
  first_name: string
  last_name: string
  phone: string
  password: string
  password_confirm: string
}

export type LoginData = {
  login: string
  password: string
}
