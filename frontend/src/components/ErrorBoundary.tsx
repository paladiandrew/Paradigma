import { Component } from 'react'
import type { ReactNode } from 'react'
import { Box, Typography, Button, Container } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Что-то пошло не так
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Произошла ошибка при загрузке приложения
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              this.setState({ hasError: false })
              window.location.reload()
            }}
          >
            Перезагрузить страницу
          </Button>
          {this.state.error && (
            <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
              <Typography variant="body2" component="pre" sx={{ textAlign: 'left', overflow: 'auto' }}>
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}
        </Container>
      )
    }

    return this.props.children
  }
}
