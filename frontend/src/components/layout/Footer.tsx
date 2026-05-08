import { Link } from 'react-router-dom'
import { Box, Container, Typography, Link as MuiLink } from '@mui/material'
import Grid from '@mui/material/Grid'

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
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              PARADIGMA BJJ
            </Typography>
            <Typography variant="body2" color="grey.400">
              Академия единоборств
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
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

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle1" fontWeight="semibold" gutterBottom>
              Контакты
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="grey.400">
                ЖК «Южная Битца»
                <br />
                ул. Южный бульвар, д. 4
              </Typography>
              <MuiLink href="tel:+79362999933" color="grey.400" sx={{ '&:hover': { color: 'white' } }}>
                +7 (936) 299-99-33
              </MuiLink>
              <Typography variant="body2" color="grey.400">
                <strong>Email:</strong> info@paradigma-bjj.ru
              </Typography>
              <Typography variant="body2" color="grey.400">
                <strong>Режим работы:</strong> Пн-Вс: 9:00 - 22:00
              </Typography>
              <MuiLink
                href="https://www.instagram.com/paradigma_jj?igsh=MWswZjA4dTYzY3BjMg=="
                target="_blank"
                rel="noopener noreferrer"
                color="grey.400"
                sx={{ '&:hover': { color: 'white' } }}
              >
                Instagram
              </MuiLink>
              <MuiLink
                href="https://t.me/chersibjj"
                target="_blank"
                rel="noopener noreferrer"
                color="grey.400"
                sx={{ '&:hover': { color: 'white' } }}
              >
                Telegram
              </MuiLink>
              <MuiLink
                href="https://chat.whatsapp.com/FXEPOvUlzOFJqiuwJbVqLr"
                target="_blank"
                rel="noopener noreferrer"
                color="grey.400"
                sx={{ '&:hover': { color: 'white' } }}
              >
                WhatsApp
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
            © {new Date().getFullYear()} Paradigma BJJ. Все права защищены.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
