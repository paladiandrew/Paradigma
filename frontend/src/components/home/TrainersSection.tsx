import BoltIcon from '@mui/icons-material/Bolt'
import { Box, Card, Chip, Divider, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import Grid from '@mui/material/Grid'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import MobileLoopCarousel from '../common/MobileLoopCarousel'
import RevealWrapper from '../common/RevealWrapper'
import SectionTitle from './SectionTitle'
import {
  MARKETING_CARD_SHADOW,
  MARKETING_CARD_SHADOW_HOVER,
  MARKETING_CARD_TRANSITION,
} from '../../styles/marketingCards'

type Trainer = {
  id: string
  name: string
  specialty: string
  photo_url?: string
  description?: string
  sessions_conducted?: number | null
}

function TrainerCard({ trainer }: { trainer: Trainer }) {
  const hasPhoto = Boolean(trainer.photo_url)
  const initial = (trainer.name?.trim()?.[0] || '?').toUpperCase()
  const bio = (trainer.description || '').trim()
  const showStats = trainer.sessions_conducted != null && trainer.sessions_conducted > 0

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: alpha('#000000', 0.12),
        boxShadow: MARKETING_CARD_SHADOW,
        transition: MARKETING_CARD_TRANSITION,
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: MARKETING_CARD_SHADOW_HOVER,
          '& .trainer-card-photo': {
            transform: 'scale(1.03)',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 240, md: 280 },
          flexShrink: 0,
          overflow: 'hidden',
          bgcolor: '#1a1a1a',
        }}
      >
        {hasPhoto ? (
          <Box
            component="img"
            className="trainer-card-photo"
            src={trainer.photo_url}
            alt=""
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(145deg, #1a1a1a 0%, #333333 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h2" sx={{ color: '#fff', opacity: 0.7, fontWeight: 700 }}>
              {initial}
            </Typography>
          </Box>
        )}

        {hasPhoto ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, transparent 0%, transparent 60%, rgba(0,0,0,0.7) 100%)',
              pointerEvents: 'none',
            }}
          />
        ) : null}

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            p: 2,
            zIndex: 1,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              color: '#fff',
              fontWeight: 800,
              lineHeight: 1.25,
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
            }}
          >
            {trainer.name}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 4,
            bgcolor: 'secondary.main',
            zIndex: 2,
          }}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          bgcolor: '#fff',
          px: 2.5,
          py: 2.5,
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 200, sm: 220, md: 240 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <BoltIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
          <Typography
            sx={{
              color: 'secondary.main',
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.3,
            }}
          >
            {trainer.specialty || 'Тренер'}
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ flex: 1, minHeight: { xs: 120, md: 140 }, display: 'flex', flexDirection: 'column' }}>
          <Typography
            sx={{
              color: '#666',
              fontSize: 14,
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 6,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
              fontStyle: bio ? 'normal' : 'italic',
            }}
          >
            {bio || 'Информация о тренере скоро появится'}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: '#fff',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {showStats ? (
          <Chip
            size="small"
            variant="outlined"
            color="secondary"
            label={`Провёл ${trainer.sessions_conducted} занятий`}
            sx={{ fontWeight: 600 }}
          />
        ) : null}
      </Box>
    </Card>
  )
}

export default function TrainersSection() {
  const theme = useTheme()
  const isMobileCarousel = useMediaQuery(theme.breakpoints.down('sm'))
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/trainers')
      .then((res) => setTrainers(res.data || []))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && trainers.length === 0) {
    return null
  }

  return (
    <Box sx={{ py: { xs: 8, md: 14 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <SectionTitle title="Наши тренеры" subtitle="Тренеры с опытом и вниманием к деталям" />
      {loading && isMobileCarousel && (
        <Skeleton variant="rounded" height={520} sx={{ borderRadius: 3, width: '100%' }} />
      )}
      {loading && !isMobileCarousel && (
        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto', justifyContent: 'center' }}>
          {[1, 2, 3].map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item}>
              <Skeleton variant="rounded" height={520} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      )}
      {!loading && isMobileCarousel && trainers.length > 0 && (
        <MobileLoopCarousel>
          {trainers.map((trainer) => (
            <RevealWrapper key={trainer.id} threshold={0.08}>
              <TrainerCard trainer={trainer} />
            </RevealWrapper>
          ))}
        </MobileLoopCarousel>
      )}
      {!loading && !isMobileCarousel && (
        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto', justifyContent: 'center' }}>
          {trainers.map((trainer, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={trainer.id}>
              <RevealWrapper threshold={0.08} delayMs={(i % 3) * 100}>
                <TrainerCard trainer={trainer} />
              </RevealWrapper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
