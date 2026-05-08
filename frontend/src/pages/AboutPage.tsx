import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Link,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'

export default function AboutPage() {
  return (
    <Container sx={{ py: { xs: 4, md: 8 } }}>
      <Typography variant="h3" fontWeight="bold" sx={{ mb: 4, fontSize: { xs: '2rem', md: '2.5rem' } }}>
        Об академии
      </Typography>

      {/* Информация об академии */}
      <Box sx={{ mb: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
              Paradigma BJJ
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Paradigma BJJ — это современная академия единоборств, где каждый может начать свой путь в
              удивительном мире боевых искусств. Мы предлагаем профессиональное обучение для всех уровней подготовки
              — от новичков до опытных спортсменов.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Наша миссия — развивать единоборства в регионе и помогать людям становиться сильнее не только физически, но и
              морально. Мы верим, что единоборства — это не просто спорт, это образ жизни.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Новости и акции */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
          Новости и акции
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Chip label="Акция" color="secondary" sx={{ mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Скидка 20% на первый месяц
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Для новых клиентов действует специальное предложение — скидка 20% на первый месяц занятий при
                  покупке абонемента.
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
                  Действует до 31 января 2025
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Chip label="Новость" color="secondary" sx={{ mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Новый тренер в команде
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  К нашей команде присоединился новый тренер с черным поясом и опытом участия в международных
                  соревнованиях.
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
                  15 января 2025
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Контакты */}
      <Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
          Контакты
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Адрес
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  г. Москва, ул. Примерная, д. 123
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ближайшее метро: Примерная (5 минут пешком)
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Контакты
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Телефон:</strong> +7 (XXX) XXX-XX-XX
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email:</strong> info@paradigma-bjj.ru
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Режим работы:</strong> Пн-Вс: 9:00 - 22:00
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Карта (заглушка) */}
        <Card sx={{ mt: 4 }}>
          <Box
            sx={{
              height: 256,
              backgroundColor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Карта будет здесь
            </Typography>
          </Box>
        </Card>

        {/* Социальные сети */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Мы в социальных сетях
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="#" color="secondary" sx={{ fontSize: '1.5rem', '&:hover': { color: 'secondary.dark' } }}>
                Instagram
              </Link>
              <Link href="#" color="secondary" sx={{ fontSize: '1.5rem', '&:hover': { color: 'secondary.dark' } }}>
                Telegram
              </Link>
              <Link href="#" color="secondary" sx={{ fontSize: '1.5rem', '&:hover': { color: 'secondary.dark' } }}>
                VK
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}
