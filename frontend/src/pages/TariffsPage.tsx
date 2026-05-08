import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SellIcon from '@mui/icons-material/Sell'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { alpha } from '@mui/material/styles'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  MARKETING_CARD_SHADOW,
  MARKETING_CARD_SHADOW_HOVER,
  MARKETING_CARD_TRANSITION,
} from '../styles/marketingCards'
import TariffHeaderWave from '../components/tariffs/TariffHeaderWave'
import TariffLeftAccent from '../components/tariffs/TariffLeftAccent'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api, { getApiErrorMessage } from '../services/api'
import { parseApiCalendarDate, dateInputToIsoNoon, isDiscountCalendarDateStillValid } from '../utils/formatDates'

type TariffPlan = {
  id: string
  name: string
  description: string
  price: number
  popular?: boolean
  features?: string[]
  bonuses?: string[]
  discount_percent?: number
  discount_until?: string | null
}

type SubProfileRow = {
  id: string
  first_name: string
  last_name: string
  phone?: string
  birth_date?: string | null
}

/** Ответ GET /tariffs (Beanie) может содержать `_id` вместо `id`. */
function normalizeTariffRow(raw: Record<string, unknown>): TariffPlan {
  const id = String(raw.id ?? raw._id ?? '')
  return {
    id,
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    price: Number(raw.price ?? 0),
    popular: raw.popular === true,
    features: Array.isArray(raw.features) ? (raw.features as string[]) : undefined,
    bonuses: Array.isArray(raw.bonuses) ? (raw.bonuses as string[]) : undefined,
    discount_percent: raw.discount_percent != null ? Number(raw.discount_percent) : undefined,
    discount_until: raw.discount_until != null ? String(raw.discount_until) : null,
  }
}

function discountActive(t: TariffPlan): boolean {
  const p = t.discount_percent || 0
  if (p <= 0) return false
  return isDiscountCalendarDateStillValid(t.discount_until)
}

function effectivePrice(t: TariffPlan): number {
  if (!discountActive(t)) return t.price
  return Math.max(0, Math.round((t.price * (100 - (t.discount_percent || 0))) / 100))
}

function ageFromBirth(iso: string | null | undefined): string | null {
  const b = parseApiCalendarDate(iso || null)
  if (!b) return null
  const y = Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000))
  return `${y} лет`
}

function initials(first: string, last: string) {
  return `${(first || '?').slice(0, 1)}${(last || '').slice(0, 1)}`.toUpperCase()
}

function TariffDescriptionBlock({ text, accent }: { text: string; accent: 'secondary' | 'warning' }) {
  const trimmed = text?.trim()
  const [expanded, setExpanded] = useState(false)
  const [showToggle, setShowToggle] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !trimmed) {
      setShowToggle(false)
      return
    }
    if (expanded) {
      setShowToggle(true)
      return
    }
    setShowToggle(el.scrollHeight > el.clientHeight + 2)
  }, [trimmed, expanded])

  if (!trimmed) return null

  return (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#F9F9F9', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <InfoOutlinedIcon
          sx={{
            color: accent === 'warning' ? 'warning.dark' : 'text.secondary',
            fontSize: 22,
            flexShrink: 0,
            mt: 0.25,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Collapse in={!expanded} timeout="auto" collapsedSize={0}>
            <Typography
              ref={ref}
              component="p"
              sx={{
                m: 0,
                color: '#555',
                fontSize: 15,
                lineHeight: 1.7,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {trimmed}
            </Typography>
          </Collapse>
          <Collapse in={expanded} timeout="auto" collapsedSize={0}>
            <Typography
              component="p"
              sx={{ m: 0, color: '#555', fontSize: 15, lineHeight: 1.7, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {trimmed}
            </Typography>
          </Collapse>
          {showToggle ? (
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              color={accent}
              sx={{ mt: 0.5, p: 0, minWidth: 0, fontWeight: 700, textTransform: 'none' }}
            >
              {expanded ? 'Свернуть' : 'Читать далее...'}
            </Button>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}

function TariffPlanCard({
  tariff,
  focusId,
  focusPulse,
  onChoose,
}: {
  tariff: TariffPlan
  focusId: string | null
  focusPulse: boolean
  onChoose: (t: TariffPlan) => void
}) {
  const theme = useTheme()
  const disc = discountActive(tariff)
  const pop = Boolean(tariff.popular) && !disc
  const eff = effectivePrice(tariff)
  const headerBg = disc ? '#E65100' : '#1a1a1a'
  const accentColor = disc ? 'warning' : 'secondary'

  const bulletColor = disc ? 'warning.main' : 'secondary.main'

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        /* Единый отступ сверху — без смещения «популярных» относительно остальных в сетке */
        pt: 2.5,
        overflow: 'visible',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
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
            zIndex: (t) => t.zIndex.tooltip,
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
            zIndex: (t) => t.zIndex.tooltip,
            fontWeight: 800,
            boxShadow: '0 4px 16px rgba(230,81,0,0.35)',
          }}
        />
      )}
      <Card
        id={`tariff-${tariff.id}`}
        elevation={0}
        sx={{
          height: '100%',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: MARKETING_CARD_TRANSITION,
          ...(disc
            ? {
                border: '2px solid',
                borderColor: 'warning.main',
              }
            : {
                border: '1px solid',
                borderColor: 'divider',
              }),
          boxShadow: disc
            ? `0 4px 20px rgba(0,0,0,0.08), 0 8px 24px ${alpha(theme.palette.warning.main, 0.15)}`
            : pop
              ? `${MARKETING_CARD_SHADOW}, 0 6px 20px ${alpha(theme.palette.secondary.main, 0.12)}`
              : MARKETING_CARD_SHADOW,
          bgcolor: '#fff',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: disc
              ? `${MARKETING_CARD_SHADOW_HOVER}, 0 12px 28px ${alpha(theme.palette.warning.main, 0.2)}`
              : pop
                ? `${MARKETING_CARD_SHADOW_HOVER}, 0 12px 28px ${alpha(theme.palette.secondary.main, 0.18)}`
                : MARKETING_CARD_SHADOW_HOVER,
          },
          ...(focusId === tariff.id && {
            outline: `3px solid ${disc ? theme.palette.warning.main : theme.palette.secondary.main}`,
            outlineOffset: 2,
          }),
          ...(focusPulse &&
            focusId === tariff.id && {
              animation: 'tariffFocusPulse 1.5s ease-out 2',
              '@keyframes tariffFocusPulse': {
                '0%': {
                  boxShadow: disc
                    ? `0 0 0 0 ${alpha(theme.palette.warning.main, 0.55)}`
                    : `0 0 0 0 ${alpha(theme.palette.secondary.main, 0.55)}`,
                },
                '100%': {
                  boxShadow: disc
                    ? `0 0 0 14px ${alpha(theme.palette.warning.main, 0)}`
                    : `0 0 0 14px ${alpha(theme.palette.secondary.main, 0)}`,
                },
              },
            }),
        }}
      >
        {!disc && <TariffLeftAccent />}
        {disc && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: (t) => t.zIndex.tooltip,
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: 'warning.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 900,
              animation: 'discBadge 1.6s ease-in-out infinite',
              '@keyframes discBadge': {
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
            bgcolor: headerBg,
            color: '#fff',
            pt: pop ? 4 : 2.5,
            px: 2.5,
            pb: 0,
            position: 'relative',
            textAlign: 'center',
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{
              mb: 2,
              lineHeight: 1.25,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              width: '100%',
              /* Кружок скидки справа (44px + 10px inset) — симметричные поля, чтобы заголовок визуально по центру карточки */
              ...(disc ? { pl: '54px', pr: '54px' } : {}),
            }}
          >
            {tariff.name}
          </Typography>
          <Box sx={{ mb: 0.5, width: '100%' }}>
            {disc && (
              <Typography sx={{ color: '#999', textDecoration: 'line-through', fontSize: 16, mb: 0.5 }}>
                {tariff.price.toLocaleString('ru-RU')} ₽
              </Typography>
            )}
            <Typography variant="h3" fontWeight={800} sx={{ color: disc ? '#fff' : 'secondary.main', lineHeight: 1.1 }}>
              {eff.toLocaleString('ru-RU')} ₽
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: disc ? 'rgba(255,255,255,0.85)' : 'grey.400', mt: 0.5 }}
            >
              ₽/мес
            </Typography>
          </Box>
          <TariffHeaderWave />
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fff', px: 3, pt: 1.5, pb: 0 }}>
          <TariffDescriptionBlock text={tariff.description || ''} accent={accentColor} />

          <Box sx={{ mb: 2, flex: 1 }}>
            {tariff.features?.map((feature: string, idx: number) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1.5, mb: 1.25, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: bulletColor,
                    mt: '10px',
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{ fontSize: 15, lineHeight: 1.8, color: 'text.primary', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {feature}
                </Typography>
              </Box>
            ))}
          </Box>

          {tariff.bonuses && tariff.bonuses.length > 0 && (
            <Box
              sx={{
                bgcolor: '#FFF3E0',
                borderRadius: 2,
                p: 1.5,
                mb: 2,
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
              }}
            >
              <Typography component="span" sx={{ fontSize: 18, flexShrink: 0 }}>
                🎁
              </Typography>
              <Box>
                {tariff.bonuses.map((bonus: string, idx: number) => (
                  <Typography key={idx} sx={{ fontSize: 14, color: 'text.secondary' }}>
                    Бонус: {bonus}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="contained"
            fullWidth
            color={disc ? 'warning' : 'secondary'}
            onClick={() => onChoose(tariff)}
            sx={{
              height: 48,
              fontSize: 16,
              fontWeight: 800,
              '&:hover': {
                bgcolor: disc ? 'warning.dark' : 'secondary.dark',
              },
            }}
          >
            Выбрать
          </Button>
        </Box>
      </Card>
    </Box>
  )
}

export default function TariffsPage() {
  const theme = useTheme()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  /** Один столбец и fullScreen-диалоги на узком экране; без Grid — нет отрицательных margin у сетки. */
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'))

  const [tariffs, setTariffs] = useState<TariffPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [focusPulse, setFocusPulse] = useState(false)

  const [flowTariff, setFlowTariff] = useState<TariffPlan | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<0 | 1>(0)
  const [recipient, setRecipient] = useState<'self' | string>('self')
  const [subProfiles, setSubProfiles] = useState<SubProfileRow[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', phone: '', birth_date: '' })

  const loadTariffs = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.get('/tariffs')
      const rows = Array.isArray(res.data) ? res.data : []
      setTariffs(rows.map((t) => normalizeTariffRow(t as Record<string, unknown>)))
    } catch {
      setLoadError('Не удалось загрузить тарифы')
      setTariffs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTariffs()
  }, [loadTariffs])

  useEffect(() => {
    if (!focusId || !tariffs.some((t) => t.id === focusId)) return
    setFocusPulse(true)
    let cancelled = false
    const runScroll = () => {
      if (cancelled) return
      const el = document.getElementById(`tariff-${focusId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(runScroll)
    })
    const t = window.setTimeout(() => setFocusPulse(false), 3000)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [focusId, tariffs])

  const refreshSubProfiles = useCallback(async () => {
    if (!isAuthenticated) {
      setSubProfiles([])
      return
    }
    try {
      const r = await api.get('/users/me/sub-profiles')
      setSubProfiles(r.data || [])
    } catch {
      setSubProfiles([])
    }
  }, [isAuthenticated])

  useEffect(() => {
    refreshSubProfiles()
  }, [refreshSubProfiles])

  const openCheckout = (tariff: TariffPlan) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setFlowTariff(tariff)
    setRecipient('self')
    setCheckoutStep(0)
  }

  const createSubProfileInline = async () => {
    await api.post('/users/me/sub-profiles', {
      first_name: addForm.first_name,
      last_name: addForm.last_name,
      phone: addForm.phone || undefined,
      birth_date: dateInputToIsoNoon(addForm.birth_date),
    })
    setAddOpen(false)
    setAddForm({ first_name: '', last_name: '', phone: '', birth_date: '' })
    await refreshSubProfiles()
    toast.success('Связанный профиль добавлен')
  }

  const createPayment = async () => {
    if (!flowTariff) return
    const tariffId = String(flowTariff.id ?? '').trim()
    if (!tariffId) {
      toast.error('Не удалось определить тариф. Обновите страницу и попробуйте снова.')
      return
    }
    const subId = recipient === 'self' ? undefined : recipient
    const res = await toast.promise(
      api.post('/payments/create-payment', {
        tariff_id: tariffId,
        sub_profile_id: subId || undefined,
      }),
      {
        loading: 'Создаем платеж...',
        success: 'Переход к оплате',
        error: (e) => getApiErrorMessage(e, 'Не удалось создать платеж'),
      },
    )
    if (res.data?.confirmation_url) {
      window.location.href = res.data.confirmation_url
    }
  }

  const recipientLabel = () => {
    if (!user) return ''
    if (recipient === 'self') {
      return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Я'
    }
    const sp = subProfiles.find((p) => p.id === recipient)
    return sp ? `${sp.first_name} ${sp.last_name}` : ''
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'visible',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute',
          top: -120,
          left: -120,
          width: 420,
          height: 420,
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 3, md: 8 },
          paddingLeft: { xs: 'max(16px, env(safe-area-inset-left, 0px))', sm: 3 },
          paddingRight: { xs: 'max(16px, env(safe-area-inset-right, 0px))', sm: 3 },
          position: 'relative',
          minWidth: 0,
        }}
      >
        <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ mb: 1.5, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
          Выберите тариф
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 6, maxWidth: 500, mx: 'auto', fontSize: 16, lineHeight: 1.6 }}
        >
          Занимайтесь регулярно и достигайте целей
        </Typography>

        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 3, maxWidth: 560, mx: 'auto' }}
            action={
              <Button color="inherit" size="small" onClick={loadTariffs}>
                Повторить
              </Button>
            }
          >
            {loadError}
          </Alert>
        )}

        {loading &&
          (isPhone ? (
            <Stack spacing={3} sx={{ width: '100%', minWidth: 0 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" animation="pulse" height={500} sx={{ borderRadius: 3, width: '100%' }} />
              ))}
            </Stack>
          ) : (
            <Grid
              container
              spacing={3}
              sx={{ maxWidth: 1200, mx: 'auto', justifyContent: 'center', minWidth: 0, width: '100%' }}
            >
              {[1, 2, 3].map((i) => (
                <Grid
                  key={i}
                  size={{ xs: 12, sm: 6, md: 4 }}
                  sx={{ display: 'flex', justifyContent: 'center', minWidth: 0, maxWidth: '100%' }}
                >
                  <Skeleton variant="rounded" animation="pulse" height={500} sx={{ borderRadius: 3, width: '100%' }} />
                </Grid>
              ))}
            </Grid>
          ))}

        {!loading && !loadError && tariffs.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <SellIcon sx={{ fontSize: 64, color: 'grey.300' }} />
            <Typography sx={{ color: 'text.secondary', fontSize: 16, mt: 2 }}>
              Тарифы скоро появятся. Загляните позже.
            </Typography>
          </Box>
        )}

        {!loading && tariffs.length > 0 && (
          <>
            {isPhone ? (
              <Stack spacing={3} sx={{ width: '100%', minWidth: 0, maxWidth: 1200, mx: 'auto' }}>
                {tariffs.map((tariff) => (
                  <Box key={tariff.id} sx={{ width: '100%', minWidth: 0 }}>
                    <TariffPlanCard
                      tariff={tariff}
                      focusId={focusId}
                      focusPulse={focusPulse}
                      onChoose={openCheckout}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Grid
                container
                spacing={isTablet ? 2.5 : 3}
                sx={{
                  maxWidth: 1200,
                  mx: 'auto',
                  justifyContent: 'center',
                  minWidth: 0,
                  width: '100%',
                  overflow: 'visible',
                }}
              >
                {tariffs.map((tariff) => (
                  <Grid
                    size={{ xs: 12, sm: 6, md: 4 }}
                    key={tariff.id}
                    sx={{
                      minWidth: 0,
                      maxWidth: '100%',
                      overflow: 'visible',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                      <TariffPlanCard
                        tariff={tariff}
                        focusId={focusId}
                        focusPulse={focusPulse}
                        onChoose={openCheckout}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Container>

      <Dialog
        open={Boolean(flowTariff) && checkoutStep === 0}
        onClose={() => setFlowTariff(null)}
        fullWidth
        maxWidth="sm"
        fullScreen={isPhone}
      >
        <DialogTitle>Для кого тариф?</DialogTitle>
        <DialogContent>
          {flowTariff && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {flowTariff.name} · {effectivePrice(flowTariff).toLocaleString('ru-RU')} ₽
            </Typography>
          )}
          <RadioGroup value={recipient} onChange={(e) => setRecipient(e.target.value as 'self' | string)}>
            {user && (
              <FormControlLabel
                value="self"
                control={<Radio color="secondary" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                    <Avatar src={user.avatar_url || undefined} sx={{ bgcolor: 'secondary.main' }}>
                      {initials(user.first_name || '', user.last_name || '')}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={700}>
                        Я ({[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'профиль'})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.phone || user.email || ''}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            )}
            {subProfiles.map((sp) => (
              <FormControlLabel
                key={sp.id}
                value={sp.id}
                control={<Radio color="secondary" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                    <Avatar sx={{ bgcolor: 'grey.700' }}>{initials(sp.first_name, sp.last_name)}</Avatar>
                    <Box>
                      <Typography fontWeight={700}>
                        {sp.first_name} {sp.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[ageFromBirth(sp.birth_date || undefined), sp.phone].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            ))}
          </RadioGroup>
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => setAddOpen(true)}
            sx={{ mt: 2, display: 'inline-block', cursor: 'pointer' }}
          >
            + Добавить связанный профиль
          </Link>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFlowTariff(null)}>Отмена</Button>
          <Button variant="contained" color="secondary" disabled={!user} onClick={() => setCheckoutStep(1)}>
            Продолжить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs" fullScreen={isPhone}>
        <DialogTitle>Новый связанный профиль</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Имя *" value={addForm.first_name} onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))} />
          <TextField label="Фамилия *" value={addForm.last_name} onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))} />
          <TextField label="Телефон" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
          <TextField
            label="Дата рождения"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={addForm.birth_date}
            onChange={(e) => setAddForm((f) => ({ ...f, birth_date: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={!addForm.first_name.trim() || !addForm.last_name.trim()}
            onClick={createSubProfileInline}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(flowTariff) && checkoutStep === 1}
        onClose={() => {
          setCheckoutStep(0)
          setFlowTariff(null)
        }}
        fullWidth
        maxWidth="sm"
        fullScreen={isPhone}
      >
        <DialogTitle>Подтверждение оплаты</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src={recipient === 'self' ? user?.avatar_url || undefined : undefined} sx={{ bgcolor: 'secondary.main' }}>
              {recipient === 'self' && user
                ? initials(user.first_name || '', user.last_name || '')
                : (() => {
                    const sp = subProfiles.find((p) => p.id === recipient)
                    return sp ? initials(sp.first_name, sp.last_name) : '?'
                  })()}
            </Avatar>
            <Typography fontWeight={700}>{recipientLabel()}</Typography>
          </Box>
          {flowTariff && (
            <>
              <Typography variant="body1">
                Тариф: <strong>{flowTariff.name}</strong>
              </Typography>
              {discountActive(flowTariff) && (
                <Typography variant="body2" color="text.secondary">
                  Скидка {flowTariff.discount_percent}% · было {flowTariff.price.toLocaleString('ru-RU')} ₽
                </Typography>
              )}
              <Typography variant="h4" fontWeight={800} color="secondary">
                Итого: {effectivePrice(flowTariff).toLocaleString('ru-RU')} ₽
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Итоговая сумма с учётом акций будет рассчитана на сервере.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setCheckoutStep(0)}>Назад</Button>
          <Button variant="contained" color="secondary" onClick={createPayment}>
            Оплатить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
