import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Box, Button, Card, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material'
import Grid from '@mui/material/Grid'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import MobileLoopCarousel from '../common/MobileLoopCarousel'
import RevealWrapper from '../common/RevealWrapper'
import SectionTitle from './SectionTitle'
import TariffHeaderWave from '../tariffs/TariffHeaderWave'
import TariffLeftAccent from '../tariffs/TariffLeftAccent'
import {
  MARKETING_CARD_SHADOW,
  MARKETING_CARD_SHADOW_HOVER,
  MARKETING_CARD_TRANSITION,
} from '../../styles/marketingCards'
import { isDiscountCalendarDateStillValid } from '../../utils/formatDates'

type Tariff = {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
  discount_percent?: number
  discount_until?: string | null
}

function normalizeTariffFromApi(raw: Record<string, unknown>): Tariff {
  const id = String(raw.id ?? raw._id ?? '')
  return {
    id,
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    description: String(raw.description ?? ''),
    features: Array.isArray(raw.features) ? (raw.features as string[]) : [],
    popular: raw.popular === true,
    discount_percent: raw.discount_percent != null ? Number(raw.discount_percent) : undefined,
    discount_until: raw.discount_until != null ? String(raw.discount_until) : null,
  }
}

function discountActive(t: Tariff): boolean {
  const p = t.discount_percent || 0
  if (p <= 0) return false
  return isDiscountCalendarDateStillValid(t.discount_until)
}

function effectivePrice(t: Tariff): number {
  if (!discountActive(t)) return t.price
  return Math.max(0, Math.round((t.price * (100 - (t.discount_percent || 0))) / 100))
}

function TariffPreviewCard({ tariff }: { tariff: Tariff }) {
  const disc = discountActive(tariff)
  const eff = effectivePrice(tariff)
  const feats = (tariff.features || []).slice(0, 4)
  const headerBg = disc ? '#E65100' : '#1a1a1a'
  const showRecommend = tariff.popular && !disc

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        pt: 2.5,
      }}
    >
      {showRecommend && (
        <Box
          sx={{
            position: 'absolute',
            top: (t) => t.spacing(2.5),
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: (t) => t.zIndex.modal,
            px: 2,
            py: 0.5,
            borderRadius: 10,
            bgcolor: 'secondary.main',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
            boxShadow: '0 4px 16px rgba(227,6,19,0.35)',
          }}
        >
          Рекомендуем
        </Box>
      )}
      <Card
        elevation={0}
        sx={{
          height: '100%',
          minHeight: { xs: 420, md: 460 },
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          ...(disc
            ? { border: '2px solid', borderColor: 'warning.main' }
            : {
                border: '1px solid',
                borderColor: 'divider',
              }),
          boxShadow: MARKETING_CARD_SHADOW,
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          transition: MARKETING_CARD_TRANSITION,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: MARKETING_CARD_SHADOW_HOVER,
          },
        }}
      >
      {!disc && <TariffLeftAccent />}
      {disc && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 4,
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'warning.main',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(230,81,0,0.45)',
            animation: 'tariffPulse 1.6s ease-in-out infinite',
            '@keyframes tariffPulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.08)' },
            },
          }}
        >
          −{tariff.discount_percent}%
        </Box>
      )}

      <Box
        sx={{
          flex: '0 0 auto',
          bgcolor: headerBg,
          color: '#fff',
          px: 2.5,
          pt: showRecommend ? 4 : 2.5,
          pb: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5, lineHeight: 1.25 }}>
          {tariff.name}
        </Typography>
        {disc && (
          <Typography sx={{ color: '#999', textDecoration: 'line-through', mb: 0.5, fontSize: 16 }}>
            {tariff.price.toLocaleString('ru-RU')} ₽
          </Typography>
        )}
        <Typography variant="h3" fontWeight={800} sx={{ color: disc ? '#fff' : 'secondary.main', lineHeight: 1.1 }}>
          {eff.toLocaleString('ru-RU')} ₽
        </Typography>
        <Typography variant="body2" sx={{ color: disc ? 'rgba(255,255,255,0.85)' : 'grey.400', mt: 0.5 }}>
          ₽/мес
        </Typography>
        <TariffHeaderWave />
      </Box>

      <Box
        sx={{
          flex: 1,
          bgcolor: '#fff',
          px: 3,
          pt: 1.25,
          pb: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {tariff.description?.trim() ? (
          <Typography
            sx={{
              mb: 2,
              fontSize: 15,
              lineHeight: 1.7,
              color: '#555',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {tariff.description}
          </Typography>
        ) : null}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2, flex: 1 }}>
          {feats.map((f, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: disc ? 'warning.main' : 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.125,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 16, color: '#fff' }} />
              </Box>
              <Typography sx={{ fontSize: 15, color: 'text.secondary', lineHeight: 1.5 }}>
                {f}
              </Typography>
            </Box>
          ))}
        </Box>
        <Button
          component={Link}
          to="/tariffs"
          variant="contained"
          color={disc ? 'warning' : 'secondary'}
          fullWidth
          sx={{
            height: 48,
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          Подробнее
        </Button>
      </Box>
    </Card>
    </Box>
  )
}

export default function TariffsPreview() {
  const theme = useTheme()
  const isMobileCarousel = useMediaQuery(theme.breakpoints.down('sm'))
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/tariffs')
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : []
        setTariffs(rows.slice(0, 4).map((t) => normalizeTariffFromApi(t as Record<string, unknown>)))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box sx={{ py: { xs: 8, md: 14 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <SectionTitle title="Тарифы" subtitle="Сбалансированные планы под разный ритм тренировок" />
      {loading && isMobileCarousel && (
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3, width: '100%' }} />
      )}
      {loading && !isMobileCarousel && (
        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto', justifyContent: 'center' }}>
          {[1, 2, 3].map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item}>
              <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      )}
      {!loading && isMobileCarousel && tariffs.length > 0 && (
        <MobileLoopCarousel>
          {tariffs.map((tariff, i) => (
            <RevealWrapper key={tariff.id} threshold={0.08} delayMs={(i % 3) * 100}>
              <TariffPreviewCard tariff={tariff} />
            </RevealWrapper>
          ))}
        </MobileLoopCarousel>
      )}
      {!loading && !isMobileCarousel && (
        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto', justifyContent: 'center' }}>
          {tariffs.map((tariff, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tariff.id}>
              <RevealWrapper threshold={0.08} delayMs={(i % 3) * 100}>
                <TariffPreviewCard tariff={tariff} />
              </RevealWrapper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
