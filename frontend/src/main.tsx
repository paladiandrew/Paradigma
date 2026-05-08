import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { NavVisibilityProvider } from './contexts/NavVisibilityContext'
import theme from './theme'
import './style.css'
import App from './App'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

const rootElement = document.getElementById('app')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <NavVisibilityProvider>
              <AuthProvider>
                <App />
                <Toaster
                  position="top-right"
                  containerStyle={{
                    top: 'max(8px, env(safe-area-inset-top, 0px))',
                    right: 'max(8px, env(safe-area-inset-right, 0px))',
                  }}
                />
              </AuthProvider>
            </NavVisibilityProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

