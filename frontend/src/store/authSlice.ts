import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { authService } from '../services/auth.service'
import type { User } from '../types/user'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (data: { login: string; password: string }) => {
    return await authService.login(data)
  }
)

export const adminLogin = createAsyncThunk(
  'auth/adminLogin',
  async (data: { login: string; password: string }) => {
    return await authService.adminLogin(data)
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (data: {
    first_name: string
    last_name: string
    phone: string
    password: string
    password_confirm: string
  }) => {
    return await authService.register(data)
  }
)

export const fetchUser = createAsyncThunk('auth/fetchUser', async () => {
  return await authService.getMe()
})

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Ошибка входа'
      })
      .addCase(adminLogin.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(adminLogin.fulfilled, (state) => {
        state.isLoading = false
        state.isAuthenticated = true
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Ошибка входа'
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Ошибка регистрации'
      })
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(fetchUser.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { setUser, clearError } = authSlice.actions
export default authSlice.reducer
