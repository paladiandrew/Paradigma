import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SellIcon from '@mui/icons-material/Sell'
import { Box, Button, Card, Chip, Typography } from '@mui/material'
import { MARKETING_CARD_SHADOW, MARKETING_CARD_TRANSITION } from '../../styles/marketingCards'
import TariffHeaderWave from '../tariffs/TariffHeaderWave'
import TariffLeftAccent from '../tariffs/TariffLeftAccent'
import { isDiscountCalendarDateStillValid } from '../../utils/formatDates'

type PreviewTariff = {
  name: string
  description: string
  price: number
  popular?: boolean
  features?: string[]
  bonuses?: string[]
  discount_percent?: number
  discount_until?: string | null
}

function discountActive(t: PreviewTariff): boolean {
  const p = t.discount_percent || 0
  if (p <= 0) return false
  return isDiscountCalendarDateStillValid(t.discount_until)
}

function effectivePrice(t: PreviewTariff): number {
  if (!discountActive(t)) return t.price
  return Math.max(0, Math.round((t.price * (100 - (t.discount_percent || 0))) / 100))
}

export function TariffPreviewHomeStyle({ tariff }: { tariff: PreviewTariff }) {
  const disc = discountActive(tariff)
  const eff = effectivePrice(tariff)
  const feats = (tariff.features || []).filter(Boolean).slice(0, 4)
  const headerBg = disc ? '#E65100' : '#1a1a1a'
  const showRecommend = tariff.popular && !disc

  return (
    <Box sx={{ position: 'relative', height: '100%', pt: 2.5, maxWidth: 360, mx: 'auto' }}>
      {showRecommend && (
        <Box
          sx={{
            position: 'absolute',
            top: (t) => t.spacing(2.5),
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
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
        }}
      >
        {!disc && <TariffLeftAccent />}
        <Box
          sx={{
            bgcolor: headerBg,
            color: '#fff',
            px: 2.5,
            pt: showRecommend ? 4 : 2.5,
            pb: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1, lineHeight: 1.25 }}>
            {tariff.name || '—'}
          </Typography>
          {disc && (
            <Typography sx={{ color: '#999', textDecoration: 'line-through', mb: 0.5, fontSize: 14 }}>
              {tariff.price.toLocaleString('ru-RU')} ₽
            </Typography>
          )}
          <Typography variant="h5" fontWeight={800} sx={{ color: disc ? '#fff' : 'secondary.main', lineHeight: 1.1 }}>
            {eff.toLocaleString('ru-RU')} ₽
          </Typography>
          <Typography variant="caption" sx={{ color: disc ? 'rgba(255,255,255,0.85)' : 'grey.400', mt: 0.5 }}>
            ₽/мес
          </Typography>
          <TariffHeaderWave />
        </Box>
        <Box sx={{ flex: 1, bgcolor: '#fff', px: 2, pt: 1.25, pb: 1.5, display: 'flex', flexDirection: 'column' }}>
          {tariff.description?.trim() ? (
            <Typography
              sx={{
                mb: 1,
                fontSize: 13,
                lineHeight: 1.6,
                color: '#555',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {tariff.description}
            </Typography>
          ) : null}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1, flex: 1 }}>
            {feats.map((f, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 12, color: '#fff' }} />
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.4 }}>
                  {f}
                </Typography>
              </Box>
            ))}
          </Box>
          <Button variant="contained" color="secondary" fullWidth size="small" disabled sx={{ height: 36 }}>
            Предпросмотр
          </Button>
        </Box>
      </Card>
    </Box>
  )
}

/** Упрощённая карточка как на странице тарифов. */
export function TariffPreviewPageStyle({ tariff }: { tariff: PreviewTariff }) {
  const disc = discountActive(tariff)
  const pop = Boolean(tariff.popular) && !disc
  const eff = effectivePrice(tariff)
  const headerBg = disc ? '#E65100' : '#1a1a1a'
  const accentColor = disc ? 'warning' : 'secondary'
  const feats = (tariff.features || []).filter(Boolean)
  const bonuses = (tariff.bonuses || []).filter(Boolean)

  return (
    <Box sx={{ height: '100%', pt: 2.5, position: 'relative', maxWidth: 400, mx: 'auto' }}>
      {pop && (
        <Chip
          label="Рекомендуем"
          color="secondary"
          size="small"
          sx={{
            position: 'absolute',
            top: (t) => t.spacing(2.5),
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            fontWeight: 800,
            boxShadow: '0 4px 16px rgba(227,6,19,0.35)',
          }}
        />
      )}
      {disc && (
        <Chip
          label="Акция"
          color="warning"
          size="small"
          sx={{
            position: 'absolute',
            top: (t) => t.spacing(2.5),
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            fontWeight: 800,
          }}
        />
      )}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          transition: MARKETING_CARD_TRANSITION,
          ...(disc
            ? { border: '2px solid', borderColor: 'warning.main' }
            : {
                border: '1px solid',
                borderColor: 'divider',
              }),
          boxShadow: MARKETING_CARD_SHADOW,
          bgcolor: '#fff',
        }}
      >
        {!disc && <TariffLeftAccent />}
        <Box
          sx={{
            bgcolor: headerBg,
            color: '#fff',
            pt: pop ? 4 : 2.5,
            px: 2,
            pb: 0,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5, lineHeight: 1.25 }}>
            {tariff.name || '—'}
          </Typography>
          <Box sx={{ mb: 0.5, width: '100%' }}>
            {disc && (
              <Typography sx={{ color: '#999', textDecoration: 'line-through', fontSize: 14, mb: 0.5 }}>
                {tariff.price.toLocaleString('ru-RU')} ₽
              </Typography>
            )}
            <Typography variant="h5" fontWeight={800} sx={{ color: disc ? '#fff' : 'secondary.main', lineHeight: 1.1 }}>
              {eff.toLocaleString('ru-RU')} ₽
            </Typography>
            <Typography variant="caption" sx={{ color: disc ? 'rgba(255,255,255,0.85)' : 'grey.400', mt: 0.5 }}>
              ₽/мес
            </Typography>
          </Box>
          <TariffHeaderWave />
        </Box>
        <Box sx={{ flex: 1, bgcolor: '#fff', px: 2, pt: 1.5, pb: 2 }}>
          {tariff.description?.trim() ? (
            <Box sx={{ mb: 1.5, p: 1, bgcolor: '#F9F9F9', borderRadius: 2, display: 'flex', gap: 1 }}>
              <InfoOutlinedIcon sx={{ color: accentColor === 'warning' ? 'warning.dark' : 'text.secondary', fontSize: 20 }} />
              <Typography sx={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{tariff.description}</Typography>
            </Box>
          ) : null}
          <Box sx={{ mb: 1 }}>
            {feats.map((feature, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
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
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 14, color: '#fff' }} />
                </Box>
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{feature}</Typography>
              </Box>
            ))}
          </Box>
          {bonuses.length > 0 ? (
            <Box sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={800} color="secondary" sx={{ display: 'block', mb: 0.75 }}>
                Бонусы
              </Typography>
              {bonuses.map((b, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <SellIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                  <Typography variant="body2">{b}</Typography>
                </Box>
              ))}
            </Box>
          ) : null}
          <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} disabled>
            Оформить
          </Button>
        </Box>
      </Card>
    </Box>
  )
}

export function buildPreviewTariffFromEdit(editData: Record<string, any>): PreviewTariff {
  return {
    name: String(editData.name || ''),
    description: String(editData.description || ''),
    price: Number(editData.price) || 0,
    popular: Boolean(editData.popular),
    features: Array.isArray(editData.features) ? editData.features : [],
    bonuses: Array.isArray(editData.bonuses) ? editData.bonuses : [],
    discount_percent: editData.discount_percent != null ? Number(editData.discount_percent) : 0,
    discount_until: editData.discount_until || null,
  }
}
