import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { getApiErrorMessage } from '../services/api'
import { loadSavedLogin } from '../services/savedLogin'
import PhoneTextField from '../components/PhoneTextField'
import { ruPhoneToApi } from '../utils/ruPhoneFormat'

export default function LoginPage() {
  const [tab, setTab] = useState(0)
  const [loginData, setLoginData] = useState(() => ({
    login: loadSavedLogin(),
    password: '',
  }))
  const [registerData, setRegisterData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [error, setError] = useState('')
  const { login, register, isAuthBusy } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const outcome = await login(loginData.login, loginData.password)
      if (outcome.user.role === 'admin') {
        navigate('/admin')
        return
      }
      if (returnUrl && returnUrl.startsWith('/')) {
        navigate(returnUrl)
        return
      }
      navigate('/')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка входа'))
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (registerData.password !== registerData.passwordConfirm) {
      setError('Пароли не совпадают')
      return
    }

    if (registerData.password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }

    const u = registerData.username.trim().toLowerCase()
    if (u.length < 3 || !/^[a-z0-9._-]+$/i.test(registerData.username.trim())) {
      setError('Логин: от 3 символов, латиница, цифры и . _ -')
      return
    }

    try {
      await register({
        username: u,
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        ...(ruPhoneToApi(registerData.phone).length >= 10 ? { phone: ruPhoneToApi(registerData.phone) } : {}),
        ...(registerData.email.trim() ? { email: registerData.email.trim() } : {}),
        password: registerData.password,
      })
      const outcome = await login(u, registerData.password)
      navigate(outcome.user.role === 'admin' ? '/admin' : '/')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка регистрации'))
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
            Вход / Регистрация
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Вход" />
              <Tab label="Регистрация" />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {tab === 0 ? (
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                label="Логин"
                autoComplete="username"
                fullWidth
                margin="normal"
                value={loginData.login}
                onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
                required
                helperText="Логин, email или телефон"
              />
              <TextField
                label="Пароль"
                type="password"
                autoComplete="current-password"
                fullWidth
                margin="normal"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                sx={{ mt: 3 }}
                disabled={isAuthBusy}
              >
                {isAuthBusy ? <CircularProgress size={24} /> : 'Войти'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegister}>
              <TextField
                label="Логин"
                fullWidth
                margin="normal"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                required
                helperText="3–64 символа: латиница, цифры"
              />
              <TextField
                label="Имя"
                fullWidth
                margin="normal"
                value={registerData.first_name}
                onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                required
              />
              <TextField
                label="Фамилия"
                fullWidth
                margin="normal"
                value={registerData.last_name}
                onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                required
              />
              <PhoneTextField
                label="Номер телефона (необязательно)"
                fullWidth
                margin="normal"
                value={registerData.phone}
                onValueChange={(phone) => setRegisterData({ ...registerData, phone })}
              />
              <TextField
                label="Email (необязательно)"
                type="email"
                fullWidth
                margin="normal"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              />
              <TextField
                label="Пароль"
                type="password"
                fullWidth
                margin="normal"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
              />
              <TextField
                label="Подтверждение пароля"
                type="password"
                fullWidth
                margin="normal"
                value={registerData.passwordConfirm}
                onChange={(e) => setRegisterData({ ...registerData, passwordConfirm: e.target.value })}
                required
              />
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                sx={{ mt: 3 }}
                disabled={isAuthBusy}
              >
                {isAuthBusy ? <CircularProgress size={24} /> : 'Зарегистрироваться'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}
