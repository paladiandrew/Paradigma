import { Box, Button, Card, CardContent, Chip, Container, Link as MuiLink, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material'
import Grid from '@mui/material/Grid'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import MobileLoopCarousel from '../common/MobileLoopCarousel'
import RevealWrapper from '../common/RevealWrapper'
import SectionTitle from './SectionTitle'
import { formatRuCalendarDate, isDiscountCalendarDateStillValid } from '../../utils/formatDates'

type Promotion = {
  id: string
  title: string
  description: string
  type: string
  date: string
  endDate?: string
}

function PromotionCard({ promo, highlight }: { promo: Promotion; highlight: boolean }) {
  const active = !promo.endDate || isDiscountCalendarDateStillValid(promo.endDate)
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        minHeight: { xs: 380, md: 400 },
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        background:
          'linear-gradient(165deg, rgba(255, 59, 48, 0.22) 0%, rgba(227, 6, 19, 0.16) 22%, #ffffff 50%, #fff8f7 100%)',
        border: highlight ? '2px solid' : '1px solid',
        borderColor: highlight ? 'secondary.main' : 'rgba(227, 6, 19, 0.35)',
        boxShadow: highlight
          ? '0 12px 40px rgba(227, 6, 19, 0.22), 0 0 0 1px rgba(255,255,255,0.6) inset'
          : '0 8px 28px rgba(227, 6, 19, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: { xs: '100%', sm: 520, md: 560 },
        mx: 'auto',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 48px rgba(227, 6, 19, 0.2)',
        },
      }}
    >
      {highlight && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #E30613, #ff6b6b, #E30613)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 4s ease infinite',
            '@keyframes shimmer': {
              '0%': { backgroundPosition: '0% 0%' },
              '100%': { backgroundPosition: '200% 0%' },
            },
          }}
        />
      )}
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 3, md: 3.5 }, pt: { xs: 3.5, md: 4 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Chip
            label="Акция"
            size="small"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #E30613, #ff3b30)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 2px 8px rgba(227,6,19,0.45)',
            }}
          />
          {promo.endDate && (
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {active ? `до ${formatRuCalendarDate(promo.endDate)}` : 'завершена'}
            </Typography>
          )}
        </Box>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 1.25, lineHeight: 1.2, color: 'text.primary', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
          {promo.title}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 2, flex: 1, lineHeight: 1.65, fontSize: { xs: '0.95rem', md: '1.02rem' } }}
        >
          {promo.description}
        </Typography>
        <Button
          component={Link}
          to="/tariffs"
          variant="contained"
          color="secondary"
          fullWidth
          size="large"
          sx={{
            mt: 'auto',
            py: 1.6,
            fontSize: '1.05rem',
            fontWeight: 800,
            boxShadow: '0 6px 20px rgba(227, 6, 19, 0.45)',
            background: 'linear-gradient(180deg, #ff2a2a 0%, #E30613 100%)',
            '&:hover': { background: 'linear-gradient(180deg, #ff3b3b 0%, #c50512 100%)' },
          }}
        >
          Условия и тарифы
        </Button>
      </CardContent>
    </Card>
  )
}

export default function PromotionsSection() {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/events', { params: { type: 'promotion' } })
      .then((res) => {
        const raw = res.data || []
        const mapped: Promotion[] = raw.map((e: { id: string; title: string; description: string; type: string; date: string; endDate?: string }) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          type: e.type,
          date: e.date,
          endDate: e.endDate,
        }))
        setPromos(mapped.filter((p) => !p.endDate || isDiscountCalendarDateStillValid(p.endDate)))
      })
      .finally(() => setLoading(false))
  }, [])

  if (!loading && promos.length === 0) {
    return null
  }

  return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <SectionTitle
          title="Акции"
          subtitle="Спецпредложения для новых и постоянных участников"
        />
        <MuiLink component={Link} to="/events" variant="body2" sx={{ display: 'block', textAlign: 'center', mb: 5, fontWeight: 600 }}>
          Новости клуба →
        </MuiLink>

        {loading && isNarrow && <Skeleton variant="rounded" height={400} sx={{ borderRadius: 4, width: '100%' }} />}
        {loading && !isNarrow && (
          <Grid container spacing={4}>
            {[1, 2].map((i) => (
              <Grid size={{ xs: 12, md: 6 }} key={i}>
                <Skeleton variant="rounded" height={400} sx={{ borderRadius: 4 }} />
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && isNarrow && promos.length > 0 && (
          <MobileLoopCarousel>
            {promos.map((p, i) => (
              <RevealWrapper key={p.id} threshold={0.12} delayMs={i * 100}>
                <PromotionCard promo={p} highlight={i === 0} />
              </RevealWrapper>
            ))}
          </MobileLoopCarousel>
        )}

        {!loading && !isNarrow && (
          <Grid container spacing={4}>
            {promos.map((p, i) => (
              <Grid size={{ xs: 12, md: 6 }} key={p.id}>
                <RevealWrapper threshold={0.12} delayMs={i * 100}>
                  <PromotionCard promo={p} highlight={i === 0} />
                </RevealWrapper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  )
}
