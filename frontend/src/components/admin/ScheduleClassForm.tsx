import type { Dispatch, SetStateAction } from 'react'
import { useTheme } from '@mui/material/styles'
import {
  Autocomplete,
  Avatar,
  Box,
  Collapse,
  Divider,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material'
import TitleIcon from '@mui/icons-material/Title'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import TodayIcon from '@mui/icons-material/Today'
import RepeatIcon from '@mui/icons-material/Repeat'
import RepeatOnIcon from '@mui/icons-material/RepeatOn'

const WEEKDAY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: 'Понедельник', value: 1 },
  { label: 'Вторник', value: 2 },
  { label: 'Среда', value: 3 },
  { label: 'Четверг', value: 4 },
  { label: 'Пятница', value: 5 },
  { label: 'Суббота', value: 6 },
  { label: 'Воскресенье', value: 0 },
]

const DOW_EACH: Record<number, string> = {
  0: 'воскресенье',
  1: 'понедельник',
  2: 'вторник',
  3: 'среду',
  4: 'четверг',
  5: 'пятницу',
  6: 'субботу',
}

const DOW_PLURAL: Record<number, string> = {
  0: 'воскресеньям',
  1: 'понедельникам',
  2: 'вторникам',
  3: 'средам',
  4: 'четвергам',
  5: 'пятницам',
  6: 'субботам',
}

export function trainerCardName(t: { first_name?: string; last_name?: string; username?: string }): string {
  const n = [t.first_name, t.last_name].filter(Boolean).join(' ').trim()
  return n || t.username || '—'
}

function trainerInitials(t: { first_name?: string; last_name?: string; username?: string }): string {
  const fn = (t.first_name || '').trim()
  const ln = (t.last_name || '').trim()
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase()
  if (fn) return fn.slice(0, 2).toUpperCase()
  const u = (t.username || '').trim()
  return u.slice(0, 2).toUpperCase() || '?'
}

function tariffLabel(t: { name?: string; price?: number }): string {
  const p = t.price != null ? `${Number(t.price).toLocaleString('ru-RU')} ₽` : ''
  return [t.name || '—', p].filter(Boolean).join(' · ')
}

/** Beanie/API может отдавать id или _id — для сопоставления с tariff_id в занятии. */
function entityId(row: { id?: string; _id?: string } | null | undefined): string {
  if (!row) return ''
  const v = row.id ?? row._id
  return v != null && v !== '' ? String(v) : ''
}

function autocompletePopperSlotProps(theme: import('@mui/material').Theme) {
  return {
    popper: {
      sx: { zIndex: theme.zIndex.modal + 2 },
    },
  }
}

function nextWeeklyOccurrence(dayOfWeek: number, timeStr: string): Date {
  const parts = String(timeStr || '00:00').split(':')
  const h = Number(parts[0]) || 0
  const m = Number(parts[1]) || 0
  const now = new Date()
  const out = new Date(now)
  out.setSeconds(0, 0)
  let add = (dayOfWeek - out.getDay() + 7) % 7
  out.setDate(out.getDate() + add)
  out.setHours(h, m, 0, 0)
  if (out.getTime() <= now.getTime()) {
    out.setDate(out.getDate() + 7)
  }
  return out
}

function formatRuDateTime(d: Date): string {
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRuDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function buildScheduleSummary(editData: Record<string, unknown>): string {
  const recurrence = String(editData.recurrence || 'weekly')
  const time = String(editData.time || '').trim() || '—'
  const dow = typeof editData.day_of_week === 'number' ? editData.day_of_week : Number(editData.day_of_week)
  const repeatWeeks =
    editData.repeat_weeks != null && editData.repeat_weeks !== '' ? Number(editData.repeat_weeks) : null
  const startDl = String(editData.start_datetime || '').trim()

  if (recurrence === 'once') {
    if (!startDl) return 'Укажите дату и время, чтобы увидеть сводку.'
    const d = new Date(startDl)
    if (Number.isNaN(d.getTime())) return ''
    return `Занятие пройдёт ${formatRuDateTime(d)}`
  }

  if (!Number.isFinite(dow)) return 'Выберите день недели для сводки.'

  if (recurrence === 'weekly') {
    const each = DOW_EACH[dow] ?? ''
    if (repeatWeeks == null || !Number.isFinite(repeatWeeks)) {
      return `Занятие будет проходить каждый ${each} в ${time}`
    }
    const first = nextWeeklyOccurrence(dow, time)
    const end = new Date(first)
    end.setDate(end.getDate() + (repeatWeeks - 1) * 7)
    return `Занятие будет проходить каждый ${each} в ${time}, ${repeatWeeks} ${weeksWord(
      repeatWeeks,
    )} (с ${formatRuDate(first)} по ${formatRuDate(end)})`
  }

  if (recurrence === 'biweekly') {
    const plural = DOW_PLURAL[dow] ?? ''
    if (repeatWeeks == null || !Number.isFinite(repeatWeeks)) {
      return `Занятие будет проходить раз в 2 недели по ${plural} в ${time}`
    }
    return `Занятие будет проходить раз в 2 недели по ${plural} в ${time}, ${repeatWeeks} ${weeksWord(repeatWeeks)}`
  }

  return ''
}

function weeksWord(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return 'недель'
  if (m10 === 1) return 'неделя'
  if (m10 >= 2 && m10 <= 4) return 'недели'
  return 'недель'
}

function isValidDayOfWeek(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6
}

type ScheduleFormMode = 'admin' | 'trainer'

/** Поля, обязательные для активной кнопки «Сохранить» (без учёта названия — его проверяет validateScheduleForm). */
export function scheduleSaveAllowed(
  editData: Record<string, unknown>,
  opts?: { mode?: ScheduleFormMode },
): boolean {
  const trainerCabinet = opts?.mode === 'trainer'
  if (!trainerCabinet) {
    if (!String(editData.trainer_id || '').trim()) return false
    if (!String(editData.tariff_id || '').trim()) return false
  } else if (!String(editData.trainer_id || '').trim()) {
    return false
  }
  const dur = Number(editData.duration)
  if (!Number.isFinite(dur) || dur < 1) return false
  const recurrence = String(editData.recurrence || 'weekly')
  if (recurrence === 'once') {
    if (!String(editData.start_datetime || '').trim()) return false
    return true
  }
  if (!String(editData.time || '').trim()) return false
  if (!isValidDayOfWeek(editData.day_of_week)) return false
  if (recurrence === 'biweekly' && !String(editData.start_datetime || '').trim()) return false
  return true
}

export function validateScheduleForm(
  editData: Record<string, unknown>,
  opts?: { mode?: ScheduleFormMode },
): Record<string, string> {
  const trainerCabinet = opts?.mode === 'trainer'
  const err: Record<string, string> = {}
  if (!String(editData.title || '').trim()) err.title = 'Укажите название'
  if (!trainerCabinet) {
    if (!String(editData.trainer_id || '').trim()) err.trainer_id = 'Выберите тренера'
    if (!String(editData.tariff_id || '').trim()) err.tariff_id = 'Выберите тариф для занятия'
  } else if (!String(editData.trainer_id || '').trim()) {
    err.trainer_id = 'Не удалось определить профиль тренера'
  }
  const dur = Number(editData.duration)
  if (!Number.isFinite(dur) || dur < 1) err.duration = 'Укажите длительность (мин.)'

  const recurrence = String(editData.recurrence || 'weekly')
  const startDl = String(editData.start_datetime || '').trim()
  if (recurrence === 'once' && !startDl) err.start_datetime = 'Укажите дату и время'
  if (recurrence !== 'once') {
    if (!isValidDayOfWeek(editData.day_of_week)) err.day_of_week = 'Выберите день недели'
    if (!String(editData.time || '').trim()) err.time = 'Укажите время начала'
  }
  if (recurrence === 'biweekly' && !startDl) err.start_datetime_anchor = 'Укажите дату первого занятия'

  const rw = editData.repeat_weeks
  if (recurrence !== 'once' && rw != null && rw !== '') {
    const n = Number(rw)
    if (!Number.isFinite(n) || n < 1 || n > 100) err.repeat_weeks = 'От 1 до 100 или оставьте пустым'
  }

  const mc = editData.max_capacity
  if (mc != null && mc !== '' && (Number(mc) < 1 || !Number.isFinite(Number(mc)))) {
    err.max_capacity = 'Укажите число ≥ 1 или оставьте неограниченно'
  }

  return err
}

type Props = {
  editData: Record<string, any>
  setEditData: Dispatch<SetStateAction<any>>
  fieldErrors: Record<string, string>
  trainersList: any[]
  tariffsList: any[]
  /** Кабинет тренера: тренер фиксирован; тариф можно не указывать. */
  variant?: ScheduleFormMode
}

export default function ScheduleClassForm({
  editData,
  setEditData,
  fieldErrors,
  trainersList,
  tariffsList,
  variant = 'admin',
}: Props) {
  const theme = useTheme()
  const isScheduleMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const recurrence = editData.recurrence || 'weekly'
  const selectedTrainer = trainersList.find((t) => entityId(t) === String(editData.trainer_id)) ?? null
  const selectedTariff =
    editData.tariff_id != null && String(editData.tariff_id).trim() !== ''
      ? tariffsList.find((t) => entityId(t) === String(editData.tariff_id)) ?? null
      : null

  const summary = buildScheduleSummary(editData)
  const repeatDisabled = recurrence === 'once'
  const repeatWeeksVal =
    editData.repeat_weeks === null || editData.repeat_weeks === undefined || editData.repeat_weeks === ''
      ? ''
      : String(editData.repeat_weeks)

  const maxCapDisplay =
    editData.max_capacity === null || editData.max_capacity === undefined || editData.max_capacity === ''
      ? ''
      : String(editData.max_capacity)

  const isTrainerCabinet = variant === 'trainer'

  return (
    <Box sx={{ pt: 3, px: 3, pb: 3 }}>
      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
        Основное
      </Typography>
      <Stack spacing={2}>
        <TextField
          required
          label="Название"
          variant="outlined"
          fullWidth
          value={editData.title || ''}
          error={Boolean(fieldErrors.title)}
          helperText={fieldErrors.title}
          onChange={(e) => setEditData((p: any) => ({ ...p, title: e.target.value }))}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <TitleIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl fullWidth>
          <InputLabel>Категория</InputLabel>
          <Select variant="outlined" value="trainer" label="Категория" disabled>
            <MenuItem value="trainer">Занятие с тренером</MenuItem>
          </Select>
          <FormHelperText>Только занятия с тренером</FormHelperText>
        </FormControl>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
          Тренер
        </Typography>
        {isTrainerCabinet ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="body2" fontWeight={700}>
              {selectedTrainer ? trainerCardName(selectedTrainer) : editData.trainer_name || '—'}
            </Typography>
            {selectedTrainer?.specialty ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {selectedTrainer.specialty}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              Назначаетесь вы; сменить может только администратор.
            </Typography>
            {fieldErrors.trainer_id ? (
              <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                {fieldErrors.trainer_id}
              </Typography>
            ) : null}
          </Box>
        ) : (
          <Autocomplete
            options={trainersList}
            value={selectedTrainer}
            slotProps={autocompletePopperSlotProps(theme)}
            onChange={(_e, tr) => {
              setEditData((p: any) => ({
                ...p,
                category: 'trainer',
                trainer_id: entityId(tr),
                trainer_name: tr ? trainerCardName(tr) : '',
                trainer_avatar: tr?.avatar_url || tr?.photo_url || '',
              }))
            }}
            getOptionLabel={(o) => trainerCardName(o)}
            isOptionEqualToValue={(a, b) => entityId(a) === entityId(b)}
            filterOptions={(options, state) => {
              const q = state.inputValue.toLowerCase().trim()
              if (!q) return options
              return options.filter((t) => {
                const name = trainerCardName(t).toLowerCase()
                const spec = String(t.specialty || '').toLowerCase()
                const un = String(t.username || '').toLowerCase()
                return name.includes(q) || spec.includes(q) || un.includes(q)
              })
            }}
            renderOption={(props, option) => {
              const { key, ...liProps } = props
              const av = option.avatar_url || option.photo_url
              return (
                <Box component="li" key={key} {...liProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <Avatar src={av || undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
                    {!av ? trainerInitials(option) : null}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {trainerCardName(option)}
                    </Typography>
                    {option.specialty ? (
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {option.specialty}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Тренер"
                required
                error={Boolean(fieldErrors.trainer_id)}
                helperText={fieldErrors.trainer_id}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <PersonOutlineIcon color="action" fontSize="small" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
        Расписание
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        orientation={isScheduleMobile ? 'vertical' : 'horizontal'}
        value={recurrence}
        onChange={(_e, v) => {
          if (v == null) return
          setEditData((p: any) => ({
            ...p,
            recurrence: v,
            ...(v === 'once' ? { repeat_weeks: null } : {}),
          }))
        }}
        sx={{
          mb: 2,
          gap: 1,
          '& .MuiToggleButton-root': {
            flex: isScheduleMobile ? 'none' : 1,
            py: 1,
            textTransform: 'none',
            border: '1px solid',
            borderColor: 'divider',
            '&.Mui-selected': {
              backgroundColor: 'secondary.main',
              color: 'secondary.contrastText',
              borderColor: 'secondary.main',
              '&:hover': { backgroundColor: 'secondary.dark' },
            },
          },
        }}
      >
        <ToggleButton value="once">
          <TodayIcon sx={{ mr: 0.75, fontSize: 20 }} />
          Разово
        </ToggleButton>
        <ToggleButton value="weekly">
          <RepeatIcon sx={{ mr: 0.75, fontSize: 20 }} />
          Каждую неделю
        </ToggleButton>
        <ToggleButton value="biweekly">
          <RepeatOnIcon sx={{ mr: 0.75, fontSize: 20 }} />
          Раз в 2 недели
        </ToggleButton>
      </ToggleButtonGroup>

      <Stack spacing={2}>
        <Collapse in={recurrence === 'once'} timeout="auto" unmountOnExit>
          <Stack spacing={2}>
            <TextField
              label="Дата и время занятия"
              variant="outlined"
              fullWidth
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={editData.start_datetime || ''}
              error={Boolean(fieldErrors.start_datetime)}
              helperText={fieldErrors.start_datetime}
              onChange={(e) => setEditData((p: any) => ({ ...p, start_datetime: e.target.value }))}
              inputProps={{ step: 60 }}
            />
            <TextField
              label="Длительность"
              variant="outlined"
              type="number"
              required
              value={editData.duration ?? ''}
              error={Boolean(fieldErrors.duration)}
              helperText={fieldErrors.duration}
              onChange={(e) => setEditData((p: any) => ({ ...p, duration: Number(e.target.value) }))}
              InputProps={{
                inputProps: { min: 1 },
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary">
                      мин
                    </Typography>
                  </InputAdornment>
                ),
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTimeIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Collapse>

        <Collapse in={recurrence !== 'once'} timeout="auto" unmountOnExit>
          <Stack spacing={2}>
            <FormControl fullWidth error={Boolean(fieldErrors.day_of_week)}>
              <InputLabel>День недели</InputLabel>
              <Select
                variant="outlined"
                value={isValidDayOfWeek(editData.day_of_week) ? editData.day_of_week : 1}
                label="День недели"
                onChange={(e) => setEditData((p: any) => ({ ...p, day_of_week: Number(e.target.value) }))}
              >
                {WEEKDAY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.day_of_week ? <FormHelperText>{fieldErrors.day_of_week}</FormHelperText> : null}
            </FormControl>

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                label="Время начала"
                variant="outlined"
                type="time"
                required
                InputLabelProps={{ shrink: true }}
                value={editData.time || ''}
                error={Boolean(fieldErrors.time)}
                helperText={fieldErrors.time}
                onChange={(e) => setEditData((p: any) => ({ ...p, time: e.target.value }))}
                inputProps={{ step: 300 }}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Длительность"
                variant="outlined"
                type="number"
                required
                value={editData.duration ?? ''}
                error={Boolean(fieldErrors.duration)}
                helperText={fieldErrors.duration}
                onChange={(e) => setEditData((p: any) => ({ ...p, duration: Number(e.target.value) }))}
                sx={{ flex: 1 }}
                InputProps={{
                  inputProps: { min: 1 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="body2" color="text.secondary">
                        мин
                      </Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Collapse in={recurrence === 'biweekly'} timeout="auto" unmountOnExit>
              <TextField
                label="Дата первого занятия (якорь)"
                variant="outlined"
                fullWidth
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={editData.start_datetime || ''}
                error={Boolean(fieldErrors.start_datetime_anchor)}
                helperText={fieldErrors.start_datetime_anchor}
                onChange={(e) => setEditData((p: any) => ({ ...p, start_datetime: e.target.value }))}
                inputProps={{ step: 60 }}
              />
            </Collapse>

            <TextField
              label="Количество повторений"
              variant="outlined"
              fullWidth
              type="number"
              disabled={repeatDisabled}
              placeholder="Без ограничения"
              value={repeatWeeksVal}
              error={Boolean(fieldErrors.repeat_weeks)}
              helperText={fieldErrors.repeat_weeks || 'Пусто — без ограничения; иначе число от 1 до 100'}
              onChange={(e) => {
                const raw = e.target.value.trim()
                if (raw === '') {
                  setEditData((p: any) => ({ ...p, repeat_weeks: null }))
                  return
                }
                const n = parseInt(raw, 10)
                if (!Number.isFinite(n)) return
                setEditData((p: any) => ({ ...p, repeat_weeks: Math.min(100, Math.max(1, n)) }))
              }}
              InputProps={{ inputProps: { min: 1, max: 100 } }}
            />
          </Stack>
        </Collapse>
      </Stack>

      {summary ? (
        <Typography
          variant="body2"
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            borderLeft: '3px solid',
            borderLeftColor: 'secondary.main',
          }}
        >
          {summary}
        </Typography>
      ) : null}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
        Тариф для занятия
      </Typography>
      <Stack spacing={2}>
        <Autocomplete
          options={tariffsList}
          value={selectedTariff}
          slotProps={autocompletePopperSlotProps(theme)}
          onChange={(_e, t) => {
            setEditData((p: any) => ({
              ...p,
              tariff_id: t ? entityId(t) : isTrainerCabinet ? null : '',
            }))
          }}
          getOptionLabel={(o) => tariffLabel(o)}
          isOptionEqualToValue={(a, b) => entityId(a) === entityId(b)}
          renderOption={(props, option) => {
            const { key, ...liProps } = props
            return (
              <Box
                component="li"
                key={key}
                {...liProps}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, px: 0.5 }}
              >
                <SellOutlinedIcon color="secondary" fontSize="small" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {option.name || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {option.price != null ? `${Number(option.price).toLocaleString('ru-RU')} ₽` : ''}
                    {option.duration_days != null ? ` · ${option.duration_days} дн.` : ''}
                  </Typography>
                </Box>
              </Box>
            )
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              required={!isTrainerCabinet}
              label="Тариф для занятия"
              error={Boolean(fieldErrors.tariff_id)}
              helperText={
                fieldErrors.tariff_id ||
                (isTrainerCabinet ? 'Необязательно: без выбора подходят все абонементы' : undefined)
              }
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start">
                      <SellOutlinedIcon color="action" fontSize="small" />
                    </InputAdornment>
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <TextField
          label="Максимум мест"
          variant="outlined"
          fullWidth
          type="number"
          placeholder="Не ограничено"
          value={maxCapDisplay}
          error={Boolean(fieldErrors.max_capacity)}
          helperText={fieldErrors.max_capacity}
          onChange={(e) => {
            const raw = e.target.value.trim()
            setEditData((p: any) => ({
              ...p,
              max_capacity: raw === '' ? null : Number(raw),
            }))
          }}
          InputProps={{
            inputProps: { min: 1 },
            startAdornment: (
              <InputAdornment position="start">
                <PeopleOutlineIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>
    </Box>
  )
}
