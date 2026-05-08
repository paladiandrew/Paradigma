import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useEffect, useRef, useState } from 'react'
import { addDays, mondayOfWeek } from '../../utils/scheduleWeek'

const START_H = 8
const END_H = 22
const SLOT_MIN = 30
const ROW_H = 36
const ROWS = (END_H - START_H) * (60 / SLOT_MIN)
/** Высота блока заголовка дня (день недели + кружок с числом) — должна совпадать с сеткой слотов, иначе появляется вертикальный скролл у обёртки с overflow-x. */
const SCHED_DAY_HEADER_H = 64

export type ScheduleInstance = {
  class_id: string
  starts_at: string
  duration: number
  title: string
  category: string
  trainer: { id?: string; name?: string; avatar?: string | null }
  max_capacity: number
  booked_count: number
  tariff_id?: string | null
}

type Props = {
  weekStart: Date
  onWeekStartChange: (d: Date) => void
  instances: ScheduleInstance[]
  loading: boolean
  error: string | null
  emptyLabel?: string
  bookingKeySet: Set<string>
  onInstanceClick: (inst: ScheduleInstance) => void
}

const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDayHeader(d: Date) {
  return `${dayLabels[(d.getDay() + 6) % 7]} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
}

function capitalizeRuMonth(s: string) {
  const t = s.trim()
  if (!t) return t
  return t[0].toUpperCase() + t.slice(1)
}

/** Первая строка заголовка: «Апрель 2026 г.» или с диапазоном месяцев/лет. */
function weekPeriodTitle(weekMonday: Date) {
  const weekSunday = addDays(weekMonday, 6)
  const m0 = weekMonday.getMonth()
  const y0 = weekMonday.getFullYear()
  const m1 = weekSunday.getMonth()
  const y1 = weekSunday.getFullYear()
  const monthNom = (d: Date) => capitalizeRuMonth(d.toLocaleDateString('ru-RU', { month: 'long' }))
  if (m0 === m1 && y0 === y1) {
    return `${monthNom(weekMonday)} ${y0} г.`
  }
  const dash = ' \u2013 '
  if (y0 === y1) {
    return `${monthNom(weekMonday)} ${y0} г.${dash}${monthNom(weekSunday)} ${y1} г.`
  }
  return `${monthNom(weekMonday)} ${y0} г.${dash}${monthNom(weekSunday)} ${y1} г.`
}

/** Короткий заголовок для узких экранов: «Апр – май 2026», без «г.». */
function weekPeriodTitleShort(weekMonday: Date) {
  const weekSunday = addDays(weekMonday, 6)
  const m0 = weekMonday.getMonth()
  const y0 = weekMonday.getFullYear()
  const m1 = weekSunday.getMonth()
  const y1 = weekSunday.getFullYear()
  const monShort = (d: Date) =>
    capitalizeRuMonth(
      d
        .toLocaleDateString('ru-RU', { month: 'short' })
        .replace(/\.$/, '')
        .trim(),
    )
  if (m0 === m1 && y0 === y1) {
    return `${monShort(weekMonday)} ${y0}`
  }
  if (y0 === y1) {
    return `${monShort(weekMonday)} – ${monShort(weekSunday)} ${y1}`
  }
  return `${monShort(weekMonday)} ${y0} – ${monShort(weekSunday)} ${y1}`
}

/** Тире с пробелами (U+2013) */
const RANGE_SEP = ` \u2013 `

function formatDdMmYyyy(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** Вторая строка: «20.04.2026 – 26.04.2026». */
function weekRangeSubtitle(weekMonday: Date) {
  const weekSunday = addDays(weekMonday, 6)
  return `${formatDdMmYyyy(weekMonday)}${RANGE_SEP}${formatDdMmYyyy(weekSunday)}`
}

function minutesFromDayStart(d: Date): number {
  return (d.getHours() - START_H) * 60 + d.getMinutes()
}

function dayIndexInWeek(isoStart: string, weekMonday: Date): number {
  const inst = new Date(isoStart)
  const a = new Date(weekMonday)
  a.setHours(0, 0, 0, 0)
  const b = new Date(inst.getFullYear(), inst.getMonth(), inst.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function occupancyTone(ratio: number): string {
  if (ratio < 0.7) return '#4caf50'
  if (ratio < 0.9) return '#ff9800'
  return '#f44336'
}

function InstanceCard({
  inst,
  onClick,
  booked,
  layout = 'absolute',
}: {
  inst: ScheduleInstance
  onClick: () => void
  booked: boolean
  layout?: 'absolute' | 'stacked'
}) {
  const theme = useTheme()
  const isTrainer = inst.category !== 'other'
  const start = new Date(inst.starts_at)
  const end = new Date(start.getTime() + inst.duration * 60 * 1000)
  const free = inst.max_capacity - inst.booked_count
  const full = free <= 0
  const occ = inst.max_capacity > 0 ? inst.booked_count / inst.max_capacity : 0
  const barColor = occupancyTone(occ)

  const stripe = booked ? '#4caf50' : isTrainer ? theme.palette.secondary.main : theme.palette.grey[400]

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      sx={{
        position: layout === 'absolute' ? 'absolute' : 'relative',
        left: layout === 'absolute' ? 4 : undefined,
        right: layout === 'absolute' ? 4 : undefined,
        width: layout === 'stacked' ? '100%' : undefined,
        height: layout === 'absolute' ? '100%' : undefined,
        borderRadius: 2,
        bgcolor: isTrainer ? '#1a1a1a' : '#F5F5F5',
        color: isTrainer ? '#fff' : '#333',
        p: 1.25,
        cursor: 'pointer',
        overflow: 'hidden',
        borderLeft: '3px solid',
        borderLeftColor: stripe,
        zIndex: 2,
        fontSize: 12,
        lineHeight: 1.25,
        boxShadow: theme.shadows[1],
        ...(booked && {
          bgcolor: isTrainer ? alpha('#1a1a1a', 0.92) : alpha('#e8f5e9', 0.95),
          boxShadow: `0 0 0 1px ${alpha('#4caf50', 0.5)}`,
        }),
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '@media (hover: hover)': {
          '&:hover': {
            transform: 'scale(1.03)',
            zIndex: 5,
            boxShadow: theme.shadows[4],
          },
        },
      }}
    >
      {booked && (
        <CheckCircleIcon
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            fontSize: 18,
            color: '#4caf50',
          }}
        />
      )}
      <Typography variant="caption" fontWeight={800} display="block" sx={{ pr: booked ? 2.5 : 0 }} noWrap>
        {inst.title}
      </Typography>
      <Typography variant="caption" display="block" sx={{ opacity: isTrainer ? 0.92 : 0.85, fontWeight: 600 }}>
        {pad2(start.getHours())}:{pad2(start.getMinutes())}–{pad2(end.getHours())}:{pad2(end.getMinutes())}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.35 }}>
        <Avatar src={inst.trainer?.avatar || undefined} sx={{ width: 22, height: 22, fontSize: 11 }}>
          {(inst.trainer?.name || '?').slice(0, 1)}
        </Avatar>
        <Typography variant="caption" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {inst.trainer?.name || '—'}
        </Typography>
      </Box>
      <Box sx={{ mt: 0.75, height: 2, borderRadius: 1, bgcolor: alpha(barColor, 0.25), overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, occ * 100)}%`, height: '100%', bgcolor: barColor }} />
      </Box>
      {full ? (
        <Typography
          variant="caption"
          display="block"
          sx={{
            mt: 0.5,
            color: 'error.main',
            textDecoration: 'line-through',
            bgcolor: alpha(theme.palette.error.main, 0.12),
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontWeight: 700,
          }}
        >
          Нет мест
        </Typography>
      ) : (
        <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: isTrainer ? 0.9 : 0.8 }}>
          свободно {free}/{inst.max_capacity}
        </Typography>
      )}
    </Box>
  )
}

export default function WeekSchedule({
  weekStart,
  onWeekStartChange,
  instances,
  loading,
  error,
  emptyLabel = 'На этой неделе занятий нет',
  bookingKeySet,
  onInstanceClick,
}: Props) {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))
  const isDesktopNav = useMediaQuery(theme.breakpoints.up('sm'))
  const weekMonday = mondayOfWeek(weekStart)
  const thisWeekMonday = mondayOfWeek(new Date())
  const isCurrentWeek = weekMonday.getTime() === thisWeekMonday.getTime()
  const [selectedMobileDay, setSelectedMobileDay] = useState(0)
  const touchRef = useRef<{ x: number } | null>(null)
  const [, setNowTick] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => setNowTick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const now = new Date()

  const shiftWeek = (delta: number) => {
    const n = addDays(weekMonday, delta * 7)
    onWeekStartChange(n)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current
    touchRef.current = null
    if (!start || !isNarrow) return
    const dx = e.changedTouches[0].clientX - start.x
    if (dx > 60) shiftWeek(-1)
    else if (dx < -60) shiftWeek(1)
  }

  const weekInstances = instances.filter((i) => {
    const col = dayIndexInWeek(i.starts_at, weekMonday)
    return col >= 0 && col <= 6
  })

  const mobileList = weekInstances
    .filter((i) => dayIndexInWeek(i.starts_at, weekMonday) === selectedMobileDay)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  const renderDesktop = () => {
    const gridBodyHeight = ROWS * ROW_H
    const columnHeight = SCHED_DAY_HEADER_H + gridBodyHeight
    const todayCol = (() => {
      for (let c = 0; c < 7; c++) {
        if (sameDay(addDays(weekMonday, c), now)) return c
      }
      return -1
    })()
    const showNowLine = todayCol >= 0 && now.getHours() >= START_H && now.getHours() < END_H
    const nowMins = minutesFromDayStart(now)
    const nowTop =
      showNowLine && nowMins >= 0 && nowMins < (END_H - START_H) * 60
        ? SCHED_DAY_HEADER_H + (nowMins / SLOT_MIN) * ROW_H
        : null

    return (
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          animation: 'schedWeekFade 0.2s ease-out',
          '@keyframes schedWeekFade': {
            from: { opacity: 0.35 },
            to: { opacity: 1 },
          },
        }}
      >
        <Box sx={{ width: 56, flexShrink: 0 }}>
          <Box sx={{ height: SCHED_DAY_HEADER_H, flexShrink: 0 }} />
          {Array.from({ length: ROWS }, (_, i) => {
            const totalMin = i * SLOT_MIN
            const h = START_H + Math.floor(totalMin / 60)
            const m = totalMin % 60
            return (
              <Box
                key={i}
                sx={{
                  height: ROW_H,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: 'grey.500',
                  borderTop: i ? '1px solid' : 'none',
                  borderColor: 'divider',
                  pr: 0.5,
                  textAlign: 'right',
                }}
              >
                {m === 0 ? `${pad2(h)}:${pad2(m)}` : ''}
              </Box>
            )
          })}
        </Box>
        <Box sx={{ display: 'flex', flex: 1, minWidth: 560 }}>
          {Array.from({ length: 7 }, (_, col) => {
            const dayDate = addDays(weekMonday, col)
            const colInstances = weekInstances.filter((i) => dayIndexInWeek(i.starts_at, weekMonday) === col)
            const isToday = sameDay(dayDate, now)
            return (
              <Box
                key={col}
                sx={{
                  flex: 1,
                  minWidth: 100,
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  position: 'relative',
                  height: columnHeight,
                  flexShrink: 0,
                  bgcolor: isToday ? alpha(theme.palette.background.paper, 0.5) : 'transparent',
                }}
              >
                <Box sx={{ py: 0.5, textAlign: 'center' }}>
                  <Typography variant="caption" fontWeight={700} display="block" color="text.secondary">
                    {dayLabels[(dayDate.getDay() + 6) % 7]}
                  </Typography>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      mx: 'auto',
                      mt: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      bgcolor: isToday ? 'secondary.main' : 'action.hover',
                      color: isToday ? '#fff' : 'text.primary',
                    }}
                  >
                    {dayDate.getDate()}
                  </Box>
                </Box>
                {Array.from({ length: ROWS }, (_, i) => (
                  <Box
                    key={i}
                    sx={{
                      height: ROW_H,
                      borderTop: '1px dashed',
                      borderColor: 'action.hover',
                    }}
                  />
                ))}
                {col === todayCol && nowTop != null && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: nowTop,
                      borderBottom: '2px dashed',
                      borderColor: 'secondary.main',
                      zIndex: 8,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {colInstances.map((inst) => {
                  const start = new Date(inst.starts_at)
                  const mins = minutesFromDayStart(start)
                  if (mins < 0 || mins >= (END_H - START_H) * 60) return null
                  const top = SCHED_DAY_HEADER_H + (mins / SLOT_MIN) * ROW_H
                  const h = Math.max((inst.duration / SLOT_MIN) * ROW_H, ROW_H * 0.75)
                  const bk = `${inst.class_id}|${inst.starts_at}`
                  return (
                    <Box key={bk} sx={{ position: 'absolute', top, left: 0, right: 0, height: h, zIndex: 2 }}>
                      <InstanceCard
                        inst={inst}
                        booked={bookingKeySet.has(bk)}
                        onClick={() => onInstanceClick(inst)}
                        layout="absolute"
                      />
                    </Box>
                  )
                })}
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  }

  const renderMobile = () => (
    <Box
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{
        animation: 'schedWeekFade 0.2s ease-out',
        '@keyframes schedWeekFade': {
          from: { opacity: 0.35 },
          to: { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 0.5,
          pb: 1.5,
        }}
      >
        {Array.from({ length: 7 }, (_, col) => {
          const dayDate = addDays(weekMonday, col)
          const sel = col === selectedMobileDay
          const isToday = sameDay(dayDate, now)
          const dow = (dayDate.getDay() + 6) % 7
          return (
            <ButtonBase
              key={col}
              onClick={() => setSelectedMobileDay(col)}
              focusRipple
              aria-current={sel ? 'date' : undefined}
              aria-label={formatDayHeader(dayDate)}
              sx={{
                borderRadius: 2,
                py: 1,
                px: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.35,
                minWidth: 0,
                width: '100%',
                color: sel ? 'secondary.contrastText' : 'text.primary',
                bgcolor: sel ? 'secondary.main' : isToday ? 'action.selected' : 'action.hover',
                border: '1px solid',
                borderColor: sel ? 'secondary.main' : 'divider',
                transition: (t) =>
                  t.transitions.create(['background-color', 'border-color', 'color'], { duration: 150 }),
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: 0.2,
                  opacity: sel ? 0.95 : 0.75,
                }}
              >
                {dayLabels[dow]}
              </Typography>
              <Typography component="span" sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
                {dayDate.getDate()}
              </Typography>
            </ButtonBase>
          )
        })}
      </Box>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {mobileList.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
            Нет занятий в этот день
          </Typography>
        ) : (
          mobileList.map((inst) => {
            const bk = `${inst.class_id}|${inst.starts_at}`
            return (
              <Box key={bk} sx={{ px: 0.5 }}>
                <InstanceCard
                  inst={inst}
                  booked={bookingKeySet.has(bk)}
                  onClick={() => onInstanceClick(inst)}
                  layout="stacked"
                />
              </Box>
            )
          })
        )}
      </Box>
    </Box>
  )

  const goToday = () => onWeekStartChange(mondayOfWeek(new Date()))

  return (
    <Box>
      {isNarrow ? (
        <Box sx={{ mb: 2, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 0.5,
              mb: !isCurrentWeek ? 1 : 0,
            }}
          >
            <IconButton
              onClick={() => shiftWeek(-1)}
              aria-label="Предыдущая неделя"
              color="secondary"
              sx={{
                flexShrink: 0,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center', px: 0.5, pt: 0.25 }}>
              <Typography
                component="div"
                sx={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.25,
                  wordBreak: 'break-word',
                }}
              >
                {weekPeriodTitleShort(weekMonday)}
              </Typography>
              <Typography
                component="div"
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.35, lineHeight: 1.35 }}
              >
                {weekRangeSubtitle(weekMonday)}
              </Typography>
            </Box>
            <IconButton
              onClick={() => shiftWeek(1)}
              aria-label="Следующая неделя"
              color="secondary"
              sx={{
                flexShrink: 0,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
          {!isCurrentWeek && (
            <Button fullWidth variant="outlined" color="secondary" size="medium" onClick={goToday} sx={{ py: 1 }}>
              Текущая неделя
            </Button>
          )}
        </Box>
      ) : (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
          sx={{ mb: 2, width: '100%' }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<ChevronLeftIcon />}
            onClick={() => shiftWeek(-1)}
            aria-label="Предыдущая неделя"
            sx={{ flexShrink: 0, mt: 0.25 }}
          >
            {isDesktopNav ? 'Предыдущая' : 'Пред.'}
          </Button>
          <Stack direction="column" alignItems="center" spacing={0.5} sx={{ flex: 1, minWidth: 0, px: 0.5 }}>
            <Typography
              component="div"
              sx={{
                fontSize: { xs: 16, sm: 18 },
                fontWeight: 600,
                color: 'text.primary',
                textAlign: 'center',
                lineHeight: 1.25,
              }}
            >
              {weekPeriodTitle(weekMonday)}
            </Typography>
            <Typography
              component="div"
              sx={{
                fontSize: { xs: 12, sm: 14 },
                fontWeight: 400,
                color: 'text.secondary',
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              {weekRangeSubtitle(weekMonday)}
            </Typography>
            {!isCurrentWeek && (
              <Button variant="text" size="small" color="secondary" onClick={goToday}>
                Вернуться к текущей неделе
              </Button>
            )}
          </Stack>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ChevronRightIcon />}
            onClick={() => shiftWeek(1)}
            aria-label="Следующая неделя"
            sx={{ flexShrink: 0, mt: 0.25 }}
          >
            {isDesktopNav ? 'Следующая' : 'След.'}
          </Button>
        </Stack>
      )}

      {loading && (
        <>
          {isNarrow ? (
            <Stack spacing={1.5} sx={{ py: 1 }}>
              <Skeleton variant="rounded" height={52} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
            </Stack>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, py: 2 }}>
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  animation="pulse"
                  sx={{
                    flex: 1,
                    height: 220,
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: 'secondary.main',
                      opacity: 0.6,
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </>
      )}

      {!loading && error && (
        <Typography color="error" textAlign="center">
          {error}
        </Typography>
      )}

      {!loading && !error && weekInstances.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <CalendarMonthIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography>{emptyLabel}</Typography>
        </Box>
      )}

      {!loading && !error && weekInstances.length > 0 && (isNarrow ? renderMobile() : renderDesktop())}
    </Box>
  )
}
