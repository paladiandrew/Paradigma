import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Container, Typography, Button, Card, CardContent, Link as MuiLink } from '@mui/material'
import Grid from '@mui/material/Grid'
import TariffsPreview from '../components/home/TariffsPreview'
import TrainersSection from '../components/home/TrainersSection'
import PromotionsSection from '../components/home/PromotionsSection'
import SectionTitle from '../components/home/SectionTitle'
import RevealWrapper from '../components/common/RevealWrapper'
import api from '../services/api'

const DEFAULT_ABOUT_TEXT = `Paradigma BJJ — это современная академия единоборств, где каждый может начать свой путь в удивительном мире боевых искусств. Мы предлагаем профессиональное обучение для всех уровней подготовки — от новичков до опытных спортсменов.

Наша миссия — развивать единоборства в регионе и помогать людям становиться сильнее не только физически, но и морально. Мы верим, что единоборства — это не просто спорт, это образ жизни.`

export default function HomePage() {
  const [aboutFromApi, setAboutFromApi] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/site/about')
      .then((r) => setAboutFromApi(typeof r.data?.value === 'string' ? r.data.value : ''))
      .catch(() => setAboutFromApi(''))
  }, [])

  const aboutParagraphs =
    aboutFromApi !== null && aboutFromApi.trim() !== ''
      ? aboutFromApi
          .trim()
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
      : DEFAULT_ABOUT_TEXT.split(/\n\s*\n/).map((p) => p.trim())
  return (
    <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Box
        sx={{
          background: 'linear-gradient(to bottom, #1a1a1a, #000000)',
          color: 'white',
          py: { xs: 10, md: 20 },
          textAlign: 'center',
        }}
      >
        <Container>
          <RevealWrapper threshold={0.05}>
            <Typography variant="h1" sx={{ mb: 3, fontSize: { xs: '2.5rem', md: '4rem' } }}>
              PARADIGMA <Box component="span" sx={{ color: 'secondary.main' }}>BJJ</Box>
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, color: 'grey.300', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              Академия единоборств
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
              <Button component={Link} to="/tariffs" variant="contained" color="secondary" size="large">
                Выбрать тариф
              </Button>
              <Button
                component={Link}
                to="/schedule"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'white',
                    color: 'black',
                  },
                }}
              >
                Расписание
              </Button>
            </Box>
          </RevealWrapper>
        </Container>
      </Box>

      <PromotionsSection />

      <Box sx={{ py: { xs: 8, md: 16 }, backgroundColor: 'background.paper' }}>
        <Container>
          <SectionTitle title="Почему Paradigma BJJ?" />
          <Grid container spacing={4} alignItems="stretch">
            {[
              { emoji: '🥋', title: 'Профессиональные тренеры', text: 'Опытные инструкторы с международными сертификатами' },
              { emoji: '📅', title: 'Гибкое расписание', text: 'Занятия в удобное время для всех уровней подготовки' },
              { emoji: '🏆', title: 'Подготовка к соревнованиям', text: 'Специальные программы для участия в турнирах' },
            ].map((item, i) => (
              <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }} key={item.title}>
                <RevealWrapper threshold={0.12} delayMs={i * 100}>
                  <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent
                      sx={{
                        textAlign: 'center',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="h2" sx={{ mb: 2 }}>
                        {item.emoji}
                      </Typography>
                      <Typography variant="h6" fontWeight="semibold" gutterBottom>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {item.text}
                      </Typography>
                    </CardContent>
                  </Card>
                </RevealWrapper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container>
        <TariffsPreview />
      </Container>

      <Box sx={{ pt: { xs: 5, md: 8 }, pb: { xs: 6, md: 12 }, backgroundColor: 'background.paper' }}>
        <Container>
          <SectionTitle title="Об академии" />
          <Grid container spacing={{ xs: 2.5, md: 3 }} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 6 }}>
              <RevealWrapper threshold={0.12}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ pt: { xs: 1.25, sm: 1.5 }, pb: { xs: 2, sm: 2.5 }, px: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1.25 }}>
                      Paradigma BJJ
                    </Typography>
                    {aboutParagraphs.map((para, i) => (
                      <Typography key={i} variant="body1" color="text.secondary" paragraph={i < aboutParagraphs.length - 1}>
                        {para}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </RevealWrapper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <RevealWrapper threshold={0.12} delayMs={100}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ pt: { xs: 1.25, sm: 1.5 }, pb: { xs: 2, sm: 2.5 }, px: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
                      Контакты
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>ЖК «Южная Битца»</strong>
                        <br />
                        ул. Южный бульвар, д. 4
                      </Typography>
                      <MuiLink href="tel:+79362999933" color="secondary" underline="hover" variant="body2" fontWeight={600}>
                        +7 (936) 299-99-33
                      </MuiLink>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Email:</strong> info@paradigma-bjj.ru
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Режим работы:</strong> Пн-Вс: 9:00 - 22:00
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </RevealWrapper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container>
        <TrainersSection />
      </Container>
    </Box>
  )
}
