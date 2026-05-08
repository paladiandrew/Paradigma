import axios from 'axios'
import toast from 'react-hot-toast'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TOKEN_KEY = 'access_token'

export const tokenStorage = {
  get() {
    return localStorage.getItem(TOKEN_KEY)
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
  },
}

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

export function getBackendErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  const nested = d.error
  if (nested && typeof nested === 'object') {
    const err = nested as Record<string, unknown>
    if (typeof err.message === 'string' && err.message.trim()) return err.message
    const rawDetails = err.details
    if (Array.isArray(rawDetails) && rawDetails.length > 0) {
      const first = rawDetails[0]
      if (first && typeof first === 'object' && typeof (first as Record<string, unknown>).msg === 'string') {
        return (first as Record<string, unknown>).msg as string
      }
    }
  }
  const detail = d.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msgs = detail.map((item: unknown) => {
      if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).msg === 'string') {
        return (item as Record<string, unknown>).msg as string
      }
      return typeof item === 'string' ? item : ''
    })
    const joined = msgs.filter(Boolean).join(' ')
    return joined || undefined
  }
  return undefined
}

/** Сообщение из тела ответа API; иначе fallback (без сырого «Request failed with status code»). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const m = getBackendErrorMessage(err.response.data)
    if (m) return m
  }
  return fallback
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Сервер недоступен. Проверьте соединение и попробуйте снова.')
      return Promise.reject(error)
    }
    const status = error.response?.status
    const backendMessage = getBackendErrorMessage(error.response?.data)
    if (status === 401) {
      tokenStorage.clear()
      toast.error(backendMessage || 'Сессия истекла, войдите заново')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      toast.error('Нет доступа')
    } else {
      toast.error(backendMessage || 'Что-то пошло не так')
    }
    return Promise.reject(error)
  },
)

/** Загрузка аватара (multipart); отдельный запрос без JSON Content-Type по умолчанию. */
export async function uploadTrainerAvatar(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const token = tokenStorage.get()
  return axios.post(`${API_URL}/api/v1/trainer/me/avatar`, fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  })
}

export function deleteTrainerAvatar() {
  return api.delete('/trainer/me/avatar')
}

export default api
