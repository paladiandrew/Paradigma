import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        '@supports (min-height: 100dvh)': {
          minHeight: '100dvh',
        },
      }}
    >
      <Header />
      <Box
        component="main"
        sx={(theme) => ({
          flex: 1,
          pb: {
            xs: `calc(${theme.spacing(10)} + env(safe-area-inset-bottom, 0px))`,
            md: 0,
          },
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        })}
      >
        <Outlet />
      </Box>
      <Footer />
      <BottomNav />
    </Box>
  )
}
