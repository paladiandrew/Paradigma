import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useAppDispatch } from '../store/hooks'
import { adminLogin } from '../store/authSlice'
import { getApiErrorMessage } from '../services/api'

export default function AdminLoginPage() {
  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    robots.setAttribute('data-paradigma', 'auth')
    document.head.appendChild(robots)
    return () => {
      robots.remove()
    }
  }, [])

  const [loginData, setLoginData] = useState({ login: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await dispatch(adminLogin(loginData)).unwrap()
      navigate('/admin')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка входа'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
            Вход в админ-панель
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              label="Логин"
              name="username"
              autoComplete="username"
              fullWidth
              margin="normal"
              value={loginData.login}
              onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
              required
            />
            <TextField
              label="Пароль"
              name="password"
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
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Войти'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}
