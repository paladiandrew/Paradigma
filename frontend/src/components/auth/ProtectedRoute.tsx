import { Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  children: React.ReactNode
  adminOnly?: boolean
  trainerOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false, trainerOnly = false }: Props) {
  const { isSessionLoading, isAuthenticated, user } = useAuth()

  if (isSessionLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  if (trainerOnly && user?.role !== 'trainer') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
