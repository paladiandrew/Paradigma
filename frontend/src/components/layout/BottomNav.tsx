import { Link, useLocation } from 'react-router-dom'
import { Box, useTheme } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SellIcon from '@mui/icons-material/Sell'
import PersonIcon from '@mui/icons-material/Person'

export default function BottomNav() {
  const location = useLocation()
  const theme = useTheme()
  const navItems = [
    { path: '/', label: 'Главная', icon: HomeIcon },
    { path: '/schedule', label: 'Расписание', icon: CalendarMonthIcon },
    { path: '/tariffs', label: 'Тарифы', icon: SellIcon },
    { path: '/profile', label: 'Профиль', icon: PersonIcon },
  ]

  return (
    <Box
      className="bottom-nav mobile-only"
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: 1,
        borderColor: 'divider',
        justifyContent: 'space-around',
        alignItems: 'center',
        pt: 1,
        pb: 'max(8px, env(safe-area-inset-bottom, 0px))',
        pl: 'env(safe-area-inset-left, 0px)',
        pr: 'env(safe-area-inset-right, 0px)',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              color: isActive ? theme.palette.secondary.main : theme.palette.text.secondary,
              transition: 'color 0.2s ease',
            }}
          >
            <Icon sx={{ fontSize: 28, mb: 0.5 }} />
            <Box component="span" sx={{ fontSize: 12 }}>
              {item.label}
            </Box>
          </Link>
        )
      })}
    </Box>
  )
}
