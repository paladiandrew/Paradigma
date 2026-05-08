import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/authApi'
import { getApiErrorMessage, tokenStorage } from '../services/api'
import { persistSavedLogin } from '../services/savedLogin'
import type { AuthState, User } from '../types/auth'
import toast from 'react-hot-toast'

type RegisterInput = {
  username: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  password: string
}

export type LoginOutcome = { user: User }

type AuthContextValue = AuthState & {
  login: (login: string, password: string) => Promise<LoginOutcome>
  register: (userData: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: tokenStorage.get(),
    isAuthenticated: false,
    isSessionLoading: true,
    isAuthBusy: false,
    error: null,
  })

  const loadMe = useCallback(async () => {
    const token = tokenStorage.get()
    if (!token) {
      setState((prev) => ({ ...prev, isSessionLoading: false, isAuthenticated: false, user: null }))
      return
    }

    try {
      const user = await authApi.me()
      setState((prev) => ({ ...prev, user, isAuthenticated: true, accessToken: token, isSessionLoading: false, error: null }))
    } catch (error: any) {
      tokenStorage.clear()
      setState((prev) => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        accessToken: null,
        isSessionLoading: false,
        error: error?.message || 'Сессия истекла',
      }))
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  const login = useCallback(
    async (loginStr: string, password: string): Promise<LoginOutcome> => {
      setState((prev) => ({ ...prev, isAuthBusy: true, error: null }))
      try {
        const result = await toast.promise(
          authApi.login({ login: loginStr, password }),
          {
            loading: 'Выполняется вход...',
            success: 'Вход выполнен',
            error: (err) => getApiErrorMessage(err, 'Ошибка входа'),
          },
        )

        if (!result.access_token) {
          setState((prev) => ({ ...prev, error: 'Не удалось получить токен авторизации' }))
          throw new Error('Не удалось получить токен авторизации')
        }

        persistSavedLogin(loginStr)
        tokenStorage.set(result.access_token)
        await loadMe()
        const user = await authApi.me()
        return { user }
      } finally {
        setState((prev) => ({ ...prev, isAuthBusy: false }))
      }
    },
    [loadMe],
  )

  const register = useCallback(async (userData: RegisterInput) => {
    setState((prev) => ({ ...prev, isAuthBusy: true, error: null }))
    try {
      await toast.promise(authApi.register(userData), {
        loading: 'Регистрация...',
        success: 'Аккаунт создан',
        error: (err) => getApiErrorMessage(err, 'Ошибка регистрации'),
      })
    } finally {
      setState((prev) => ({ ...prev, isAuthBusy: false }))
    }
  }, [])

  const logout = useCallback(async () => {
    await toast.promise(authApi.logout(), {
      loading: 'Выход...',
      success: 'Вы вышли из аккаунта',
      error: (err) => getApiErrorMessage(err, 'Ошибка выхода'),
    })
    setState((prev) => ({ ...prev, user: null, accessToken: null, isAuthenticated: false }))
  }, [])

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!state.user) return
      const updated = await toast.promise(authApi.updateProfile(state.user.id, data), {
        loading: 'Сохраняем профиль...',
        success: 'Профиль обновлен',
        error: (err) => getApiErrorMessage(err, 'Не удалось обновить профиль'),
      })
      setState((prev) => ({ ...prev, user: updated }))
    },
    [state.user],
  )

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      if (!state.user) return
      await toast.promise(authApi.changePassword(state.user.id, oldPassword, newPassword), {
        loading: 'Смена пароля...',
        success: 'Пароль изменен',
        error: (err) => getApiErrorMessage(err, 'Не удалось сменить пароль'),
      })
    },
    [state.user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [state, login, register, logout, updateProfile, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider')
  }
  return context
}
