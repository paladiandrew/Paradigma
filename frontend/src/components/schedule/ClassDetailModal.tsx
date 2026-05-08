import AccessTimeIcon from '@mui/icons-material/AccessTime'
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScheduleInstance } from './WeekSchedule'
import type { User } from '../../types/auth'

export type SubRow = {
  subscription_id: string
  tariff_id: string
  sub_profile_id?: string | null
  tariff?: { id: string; name: string; price: number } | null
}

export type SubProfileRow = {
  id: string
  first_name: string
  last_name: string
  active_subscription_id?: string | null
}

type ClassMeta = {
  tariff_id?: string | null
  tariff?: {
    id: string
    name: string
    description?: string
    price?: number
    effective_price?: number
  } | null
} | null

type Props = {
  open: boolean
  onClose: () => void
  instance: ScheduleInstance | null
  classMeta: ClassMeta
  isAuthenticated: boolean
  user: User | null
  subs: SubRow[]
  subProfiles: SubProfileRow[]
  bookingId: string | null
  onBook: (payload: {
    subscriptionId: string
    subProfileId?: string | null
    sessionStartsAt: string
    trainingId: string
  }) => Promise<void>
  onCancel: () => Promise<void>
}

function isSelfSubscription(s: SubRow): boolean {
  return !s.sub_profile_id
}

function pickSubscriptionForTraining(training: ScheduleInstance, subs: SubRow[], user: User | null): string | null {
  if (!training.tariff_id) {
    const selfSubs = subs.filter(isSelfSubscription)
    const fromUser = user?.active_subscription_id
    if (fromUser && selfSubs.some((s) => s.subscription_id === fromUser)) return fromUser
    return selfSubs[0]?.subscription_id || null
  }
  const m = subs.find((s) => s.tariff_id === training.tariff_id && isSelfSubscription(s))
  return m?.subscription_id || null
}

function humanDurationMinutes(min: number): string {
  if (min < 60) return `${min} мин`
  const h = min / 60
  const label = Number.isInteger(h) ? String(h) : String(h.toFixed(1)).replace(/\.0$/, '')
  return `${label} ч`
}

export default function ClassDetailModal({
  open,
  onClose,
  instance,
  classMeta,
  isAuthenticated,
  user,
  subs,
  subProfiles,
  bookingId,
  onBook,
  onCancel,
}: Props) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [bookFor, setBookFor] = useState<'self' | string>('self')

  useEffect(() => {
    if (open) setBookFor('self')
  }, [open, instance?.class_id, instance?.starts_at])

  if (!instance) return null

  const start = new Date(instance.starts_at)
  const end = new Date(start.getTime() + instance.duration * 60 * 1000)
  const free = instance.max_capacity - instance.booked_count
  const noSeats = free <= 0 && !bookingId
  const occ = instance.max_capacity > 0 ? instance.booked_count / instance.max_capacity : 0

  const subIdSelf = pickSubscriptionForTraining(instance, subs, user)
  const profilesWithSub = subProfiles.filter((p) => p.active_subscription_id)

  const resolveSubscriptionForBook = (): string | null => {
    if (bookFor === 'self') return subIdSelf
    const pr = subProfiles.find((p) => p.id === bookFor)
    return pr?.active_subscription_id || null
  }

  const subId = resolveSubscriptionForBook()
  const hasMatchingSub = Boolean(subId)
  const tariff = classMeta?.tariff
  const tariffName = tariff?.name
  const tariffPrice = tariff?.effective_price ?? tariff?.price
  /** Тариф для перехода на страницу оплаты: из слота расписания или из карточки занятия. */
  const focusTariffId = instance.tariff_id ?? classMeta?.tariff_id ?? tariff?.id ?? null

  const goBuyTariff = () => {
    onClose()
    if (focusTariffId) {
      navigate(`/tariffs?focus=${encodeURIComponent(focusTariffId)}`)
    } else {
      navigate('/tariffs')
    }
  }

  const stamp = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  const seatBadge =
    free <= 0 ? (
      <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.15), color: 'error.main', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 800, display: 'inline-block' }}>
        Мест нет
      </Box>
    ) : occ >= 0.9 ? (
      <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.2), color: 'warning.dark', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 700, display: 'inline-block' }}>
        Мало мест
      </Box>
    ) : (
      <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), color: 'success.dark', px: 1.5, py: 0.5, borderRadius: 1, fontWeight: 700, display: 'inline-block' }}>
        Есть места
      </Box>
    )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="body"
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          animation: open ? 'classModalIn 0.25s ease-out forwards' : 'none',
          '@keyframes classModalIn': {
            from: { opacity: 0, transform: 'scale(0.92)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
        },
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(to bottom, #1a1a1a, #000000)',
          color: '#fff',
          pt: 3,
          px: 2.5,
          pb: 0,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            transform: 'rotate(5deg)',
            bgcolor: '#fff',
            color: 'secondary.main',
            px: 1.5,
            py: 0.75,
            boxShadow: 3,
            fontWeight: 900,
            fontSize: 13,
            borderRadius: 0.5,
          }}
        >
          {stamp}
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ pr: 10, lineHeight: 1.25 }}>
          {instance.title}
        </Typography>
        <Box sx={{ height: 40, width: '100%', bgcolor: 'secondary.main', mt: 2, borderRadius: '8px 8px 0 0' }} />
      </Box>

      <DialogContent sx={{ display: 'grid', gap: 2.5, pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <AccessTimeIcon sx={{ color: 'secondary.main', fontSize: 28, mt: 0.25 }} />
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              {start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} –{' '}
              {end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}{' '}
              <Typography component="span" color="text.secondary" sx={{ fontSize: 16, fontWeight: 500 }}>
                ({humanDurationMinutes(instance.duration)})
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {start.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={instance.trainer?.avatar || undefined} sx={{ width: 48, height: 48 }}>
            {(instance.trainer?.name || '?').slice(0, 1)}
          </Avatar>
          <Box>
            <Typography fontWeight={800}>{instance.trainer?.name || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">
              Инструктор
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Занято {instance.booked_count} из {instance.max_capacity} мест
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, occ * 100)}
            sx={{ height: 10, borderRadius: 1 }}
            color={free <= 0 ? 'error' : occ >= 0.9 ? 'warning' : 'success'}
          />
          <Box sx={{ mt: 1 }}>{seatBadge}</Box>
        </Box>

        {focusTariffId && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              Требуемый тариф
            </Typography>
            <Typography fontWeight={700}>{tariffName || 'Абонемент'}</Typography>
            {tariffPrice != null && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                от {tariffPrice.toLocaleString('ru-RU')} ₽
              </Typography>
            )}
            <Button size="small" variant="outlined" color="secondary" sx={{ mt: 1.5 }} onClick={goBuyTariff}>
              Оформить
            </Button>
          </Box>
        )}

        {tariff?.description ? (
          <Typography variant="body2" color="text.secondary">
            {tariff.description}
          </Typography>
        ) : null}

        {isAuthenticated && profilesWithSub.length > 0 && !bookingId && (
          <FormControl>
            <FormLabel sx={{ fontWeight: 700, mb: 1 }}>Записать</FormLabel>
            <RadioGroup value={bookFor} onChange={(e) => setBookFor(e.target.value as 'self' | string)}>
              <FormControlLabel value="self" control={<Radio color="secondary" />} label="Себя" />
              {profilesWithSub.map((p) => (
                <FormControlLabel
                  key={p.id}
                  value={p.id}
                  control={<Radio color="secondary" />}
                  label={`${p.first_name} ${p.last_name}`}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, flexWrap: 'wrap', gap: 1.5 }}>
        <Button onClick={onClose} sx={{ minWidth: 160, height: 48 }}>
          Закрыть
        </Button>
        {!isAuthenticated && (
          <Button
            variant="contained"
            color="secondary"
            sx={{ minWidth: 160, height: 48 }}
            onClick={() => navigate(`/login?returnUrl=${encodeURIComponent('/schedule')}`)}
          >
            Войти и записаться
          </Button>
        )}
        {isAuthenticated && bookingId && (
          <>
            <Button variant="contained" color="success" disabled sx={{ minWidth: 160, height: 48 }}>
              Вы записаны ✓
            </Button>
            <Button
              variant="outlined"
              color="warning"
              sx={{ minWidth: 160, height: 48 }}
              onClick={async () => {
                await onCancel()
                onClose()
              }}
            >
              Отменить запись
            </Button>
          </>
        )}
        {isAuthenticated && !bookingId && !hasMatchingSub && (
          <Button variant="contained" color="secondary" sx={{ minWidth: 160, height: 48 }} onClick={goBuyTariff}>
            Купить абонемент
          </Button>
        )}
        {isAuthenticated && !bookingId && hasMatchingSub && !noSeats && (
          <Button
            variant="contained"
            color="secondary"
            sx={{ minWidth: 160, height: 48 }}
            onClick={async () => {
              const sid = resolveSubscriptionForBook()
              if (!sid) return
              await onBook({
                trainingId: instance.class_id,
                subscriptionId: sid,
                subProfileId: bookFor === 'self' ? null : bookFor,
                sessionStartsAt: instance.starts_at,
              })
            }}
          >
            Записаться
          </Button>
        )}
        {noSeats && (
          <Button variant="contained" color="error" disabled sx={{ minWidth: 160, height: 48 }}>
            Мест нет
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
