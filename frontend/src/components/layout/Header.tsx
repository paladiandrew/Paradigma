import { Link, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import { useAuth } from '../../contexts/AuthContext'
import { useNavVisibility } from '../../contexts/NavVisibilityContext'

export default function Header() {
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuth()
  const { showNewsNav } = useNavVisibility()

  const navItems = [
    { path: '/', label: 'Главная' },
    { path: '/schedule', label: 'Расписание' },
    { path: '/tariffs', label: 'Тарифы' },
    ...(showNewsNav ? [{ path: '/events', label: 'Новости' as const }] : []),
  ]

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: 2,
        zIndex: (theme) => theme.zIndex.appBar,
        pt: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          pl: { xs: 'max(16px, env(safe-area-inset-left, 0px))', md: 4 },
          pr: { xs: 'max(16px, env(safe-area-inset-right, 0px))', md: 4 },
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              '& span': {
                color: 'secondary.main',
              },
            }}
          >
            PARADIGMA<span> BJJ</span>
          </Typography>
        </Link>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              sx={{
                color: location.pathname === item.path ? 'secondary.main' : 'text.primary',
                backgroundColor: location.pathname === item.path ? 'secondary.light' : 'transparent',
                '&:hover': {
                  backgroundColor: location.pathname === item.path ? 'secondary.light' : 'grey.50',
                  color: 'secondary.main',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
          {isAuthenticated ? (
            <>
              <Button component={Link} to="/profile" variant="contained" color="secondary" sx={{ ml: 2 }}>
                {user?.role === 'trainer' ? 'Профиль тренера' : 'Профиль'}
              </Button>
              <Button onClick={logout}>Выйти</Button>
            </>
          ) : (
            <Button component={Link} to="/login" variant="contained" color="secondary" sx={{ ml: 2 }}>
              Войти
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
