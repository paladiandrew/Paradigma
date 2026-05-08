import { Link } from 'react-router-dom'
import { Box, Container, Typography, Link as MuiLink } from '@mui/material'
import Grid from '@mui/material/GridLegacy'

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'primary.main',
        color: 'white',
        py: 4,
        mt: 'auto',
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              PARADIGMA BJJ
            </Typography>
            <Typography variant="body2" color="grey.400">
              Академия единоборств
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" fontWeight="semibold" gutterBottom>
              Навигация
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink component={Link} to="/" color="grey.400" sx={{ '&:hover': { color: 'white' } }}>
                Главная
              </MuiLink>
              <MuiLink component={Link} to="/schedule" color="grey.400" sx={{ '&:hover': { color: 'white' } }}>
                Расписание
              </MuiLink>
              <MuiLink component={Link} to="/tariffs" color="grey.400" sx={{ '&:hover': { color: 'white' } }}>
                Тарифы
              </MuiLink>
              <MuiLink component={Link} to="/events" color="grey.400" sx={{ '&:hover': { color: 'white' } }}>
                Новости
              </MuiLink>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" fontWeight="semibold" gutterBottom>
              Контакты
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="grey.400">
                Телефон: +7 (XXX) XXX-XX-XX
              </Typography>
              <Typography variant="body2" color="grey.400">
                Email: info@paradigma-bjj.ru
              </Typography>
              <MuiLink href="#" color="grey.400" sx={{ '&:hover': { color: 'white' } }}>
                Социальные сети
              </MuiLink>
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            borderTop: 1,
            borderColor: 'grey.800',
            mt: 4,
            pt: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="grey.400">
            © 2025 Paradigma BJJ. Все права защищены.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
