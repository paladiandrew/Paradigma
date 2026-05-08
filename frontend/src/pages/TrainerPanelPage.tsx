import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import ScheduleClassForm, { scheduleSaveAllowed, validateScheduleForm } from '../components/admin/ScheduleClassForm'
import { useAuth } from '../contexts/AuthContext'
import api, { deleteTrainerAvatar, getApiErrorMessage, uploadTrainerAvatar } from '../services/api'
import toast from 'react-hot-toast'
import PhoneTextField from '../components/PhoneTextField'
import { displayRuPhoneFromStored, ruPhoneToApi } from '../utils/ruPhoneFormat'
import { normalizeAdminPayloadDates, toDatetimeLocalValue } from '../utils/dateTimeLocal'

const DOW_LONG: Record<number, string> = {
  0: 'Воскресенье',
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
}

function recurrenceLabelRu(r: string | undefined): string {
  if (r === 'once') return 'разовое'
  if (r === 'weekly') return 'каждую неделю'
  if (r === 'biweekly') return 'раз в 2 недели'
  return r ? String(r) : '—'
}

function formatTrainerClassScheduleLine(c: Record<string, unknown>): string {
  const durRaw = c.duration
  const dur = durRaw != null && durRaw !== '' ? Number(durRaw) : 60
  const durStr = Number.isFinite(dur) && dur > 0 ? `${dur} мин` : '—'
  const rec = String(c.recurrence || 'weekly')

  if (rec === 'once') {
    const raw = c.start_datetime
    if (raw) {
      const d = new Date(String(raw))
      if (!Number.isNaN(d.getTime())) {
        return `${d.toLocaleString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })} · ${durStr} · ${recurrenceLabelRu('once')}`
      }
    }
    return `Дата не указана · ${durStr} · ${recurrenceLabelRu('once')}`
  }

  const dowNum = typeof c.day_of_week === 'number' ? c.day_of_week : Number(c.day_of_week)
  const dow =
    Number.isFinite(dowNum) && dowNum >= 0 && dowNum <= 6 ? DOW_LONG[dowNum] ?? '—' : '—'
  const timeRaw = c.time != null ? String(c.time) : ''
  const time = timeRaw ? timeRaw.slice(0, 5) : '—'
  return `${dow}, ${time} · ${durStr} · ${recurrenceLabelRu(rec)}`
}

function isValidDayOfWeek(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6
}

function trainerInitials(first: string, last: string) {
  return `${(first || '?').slice(0, 1)}${(last || '').slice(0, 1)}`.toUpperCase()
}

export function TrainerCabinet({ embedded = false }: { embedded?: boolean }) {
  const { logout } = useAuth()
  const [trainerUserId, setTrainerUserId] = useState('')
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    specialty: '',
    trainer_bio: '',
    avatar_url: '',
    show_on_homepage: false,
  })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [tariffsList, setTariffsList] = useState<any[]>([])
  const [classDialog, setClassDialog] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [editInitial, setEditInitial] = useState<any>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const trainersListForForm = useMemo(
    () =>
      trainerUserId
        ? [
            {
              id: trainerUserId,
              first_name: profile.first_name,
              last_name: profile.last_name,
              username: profile.email,
              avatar_url: profile.avatar_url,
              specialty: profile.specialty,
            },
          ]
        : [],
    [trainerUserId, profile.first_name, profile.last_name, profile.email, profile.avatar_url, profile.specialty],
  )

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true)
    try {
      const { data } = await api.get('/trainer/me')
      setTrainerUserId(String(data.id || ''))
      setProfile({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: displayRuPhoneFromStored(data.phone),
        specialty: data.specialty || '',
        trainer_bio: data.trainer_bio || '',
        avatar_url: data.avatar_url || '',
        show_on_homepage: Boolean(data.show_on_homepage),
      })
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true)
    try {
      const { data } = await api.get('/trainer/classes')
      setClasses(data || [])
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    loadClasses()
    api.get('/trainer/tariffs').then((r) => setTariffsList(r.data || []))
  }, [loadClasses])

  const trainerPublicName = () =>
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.email || '—'

  const closeClassDialog = () => {
    setClassDialog(false)
    setFieldErrors({})
  }

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Выберите файл JPEG, PNG или WebP')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Размер файла не более 2 МБ')
      return
    }
    try {
      const { data } = await toast.promise(uploadTrainerAvatar(file), {
        loading: 'Загрузка фото…',
        success: 'Фото обновлено',
        error: (err) => getApiErrorMessage(err, 'Не удалось загрузить фото'),
      })
      setProfile((p) => ({
        ...p,
        avatar_url: data.avatar_url || '',
      }))
      await loadClasses()
    } catch {
      /* toast */
    }
  }

  const onRemoveAvatar = async () => {
    if (!profile.avatar_url?.trim()) return
    try {
      const { data } = await toast.promise(deleteTrainerAvatar(), {
        loading: 'Удаление фото…',
        success: 'Фото удалено',
        error: (err) => getApiErrorMessage(err, 'Не удалось удалить фото'),
      })
      setProfile((p) => ({
        ...p,
        avatar_url: data.avatar_url || '',
      }))
      await loadClasses()
    } catch {
      /* toast */
    }
  }

  const saveProfile = async () => {
    const { data } = await toast.promise(
      api.put('/trainer/me', {
        ...profile,
        phone: ruPhoneToApi(profile.phone),
        show_on_homepage: profile.show_on_homepage,
      }),
      { loading: 'Сохранение…', success: 'Сохранено', error: 'Ошибка' },
    )
    setTrainerUserId(String(data.id || ''))
    setProfile({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      phone: displayRuPhoneFromStored(data.phone),
      specialty: data.specialty || '',
      trainer_bio: data.trainer_bio || '',
      avatar_url: data.avatar_url || '',
      show_on_homepage: Boolean(data.show_on_homepage),
    })
  }

  const openCreateClass = () => {
    if (!trainerUserId) {
      toast.error('Загрузите профиль')
      return
    }
    setFieldErrors({})
    setEditInitial({})
    setEditData({
      title: '',
      category: 'trainer',
      recurrence: 'weekly',
      day_of_week: 1,
      time: '18:00',
      duration: 60,
      start_datetime: '',
      trainer_id: trainerUserId,
      trainer_name: trainerPublicName(),
      trainer_avatar: profile.avatar_url || '',
      tariff_id: null,
      max_capacity: null,
      repeat_weeks: null,
    })
    setClassDialog(true)
  }

  const openEditClass = (row: any) => {
    if (!trainerUserId) return
    setFieldErrors({})
    const copy = JSON.parse(JSON.stringify(row))
    const rawId = copy.id ?? copy._id
    if (rawId != null) copy.id = String(rawId)
    else delete copy.id
    delete copy._id
    if (copy.start_datetime) copy.start_datetime = toDatetimeLocalValue(copy.start_datetime)
    copy.repeat_weeks = copy.repeat_weeks ?? null
    if (copy.max_capacity === undefined || copy.max_capacity === '') copy.max_capacity = null
    copy.category = 'trainer'
    copy.trainer_id = trainerUserId
    copy.trainer_name = trainerPublicName() || copy.trainer_name
    copy.trainer_avatar = profile.avatar_url || copy.trainer_avatar
    if (!isValidDayOfWeek(copy.day_of_week)) copy.day_of_week = 1
    setEditInitial(copy)
    setEditData(copy)
    setClassDialog(true)
  }

  const saveClass = async () => {
    setFieldErrors({})
    const err = validateScheduleForm(editData as Record<string, unknown>, { mode: 'trainer' })
    if (Object.keys(err).length) {
      setFieldErrors(err)
      return
    }
    const body: Record<string, unknown> = { ...editData }
    if (body.start_datetime === '') body.start_datetime = null
    if (body.repeat_weeks === '' || body.repeat_weeks === undefined) body.repeat_weeks = null
    if (body.max_capacity === '' || body.max_capacity === undefined) body.max_capacity = null
    normalizeAdminPayloadDates('schedule', body)
    const id = editData.id
    try {
      if (id) {
        const { id: _i, _id: __i, ...payload } = body as any
        await toast.promise(api.put(`/trainer/classes/${id}`, payload), {
          loading: 'Сохранение…',
          success: 'Обновлено',
          error: 'Ошибка',
        })
      } else {
        const { id: _i, _id: __i, ...createBody } = body as any
        await toast.promise(api.post('/trainer/classes', createBody), {
          loading: 'Создание…',
          success: 'Создано',
          error: 'Ошибка',
        })
      }
      closeClassDialog()
      await loadClasses()
    } catch {
      /* toast */
    }
  }

  const doDeleteClass = async () => {
    if (!deleteTarget) return
    await toast.promise(api.delete(`/trainer/classes/${deleteTarget.id}`), {
      loading: 'Удаление…',
      success: 'Удалено',
      error: 'Ошибка',
    })
    setDeleteTarget(null)
    await loadClasses()
  }

  const hasClassEntityId = Boolean(editData?.id && String(editData.id) !== '')
  const classFormDirty =
    !hasClassEntityId || JSON.stringify(editInitial) !== JSON.stringify(editData)

  const shell = (
    <Box
      sx={{
        maxWidth: 720,
        mx: 'auto',
        p: embedded ? 0 : { xs: 2, md: 3 },
        display: 'grid',
        gap: 3,
      }}
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        {loadingProfile ? (
          <CircularProgress sx={{ mx: 'auto' }} />
        ) : (
          <>
            <TextField label="Имя" value={profile.first_name} onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))} />
            <TextField label="Фамилия" value={profile.last_name} onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))} />
            <PhoneTextField label="Телефон" value={profile.phone} onValueChange={(phone) => setProfile((p) => ({ ...p, phone }))} />
            <TextField label="Email" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
            <TextField label="Специализация" value={profile.specialty} onChange={(e) => setProfile((p) => ({ ...p, specialty: e.target.value }))} />
            <TextField
              label="О себе (на главной)"
              value={profile.trainer_bio}
              onChange={(e) => setProfile((p) => ({ ...p, trainer_bio: e.target.value }))}
              multiline
              rows={4}
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                gap: 2,
                py: 1,
              }}
            >
              <Avatar
                src={profile.avatar_url || undefined}
                alt=""
                sx={{ width: 96, height: 96, bgcolor: 'secondary.main', fontSize: 28 }}
              >
                {trainerInitials(profile.first_name, profile.last_name)}
              </Avatar>
              <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={onAvatarFileChange}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  <Button variant="outlined" color="secondary" onClick={() => avatarInputRef.current?.click()}>
                    Загрузить фото
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={!profile.avatar_url?.trim()}
                    onClick={onRemoveAvatar}
                  >
                    Удалить фото
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  С устройства: JPG, PNG или WebP, до 2 МБ
                </Typography>
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={profile.show_on_homepage}
                  onChange={(e) => setProfile((p) => ({ ...p, show_on_homepage: e.target.checked }))}
                />
              }
              label="Показывать карточку на главной странице"
            />
            <Button variant="contained" color="secondary" onClick={saveProfile}>
              Сохранить профиль
            </Button>
          </>
        )}
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3, display: 'grid', gap: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Мои занятия
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          sx={{ justifySelf: 'start' }}
          onClick={openCreateClass}
          disabled={loadingProfile || !trainerUserId}
        >
          Добавить занятие
        </Button>
        {loadingClasses ? (
          <CircularProgress sx={{ mx: 'auto' }} />
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
            {classes.map((c) => {
              const cid = c.id != null ? String(c.id) : ''
              const title = c.title || c.trainer_name || 'Занятие'
              return (
                <Card key={cid || title} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography fontWeight={700}>{title}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatTrainerClassScheduleLine(c)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Button size="small" variant="outlined" onClick={() => openEditClass(c)}>
                        Изменить
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={!cid}
                        onClick={() => setDeleteTarget({ id: cid, label: title })}
                      >
                        Удалить
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )

  const classDialogEl = (
    <>
      <Dialog
        open={classDialog}
        onClose={closeClassDialog}
        fullWidth
        maxWidth="md"
        slotProps={{ paper: { sx: { overflow: 'visible' } } }}
      >
        <DialogTitle
          sx={{
            pt: 3,
            px: 3,
            pb: 1,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!hasClassEntityId ? <AddCircleOutlineIcon color="secondary" fontSize="small" /> : null}
              <Typography variant="h6" component="span" fontWeight={700}>
                {hasClassEntityId ? 'Редактирование занятия' : 'Новое занятие'}
              </Typography>
            </Box>
            {hasClassEntityId ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {editData.title || '—'}
              </Typography>
            ) : null}
          </Box>
          <IconButton aria-label="Закрыть" onClick={closeClassDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'visible' }}>
          <ScheduleClassForm
            variant="trainer"
            editData={editData}
            setEditData={setEditData}
            fieldErrors={fieldErrors}
            trainersList={trainersListForForm}
            tariffsList={tariffsList}
          />
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 0,
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Button variant="outlined" onClick={closeClassDialog}>
            Отмена
          </Button>
          {hasClassEntityId && !classFormDirty ? (
            <Alert severity="info" sx={{ flex: '1 1 240px', py: 0.5 }}>
              Нет изменений для сохранения
            </Alert>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={saveClass}
              disabled={!scheduleSaveAllowed(editData as Record<string, unknown>, { mode: 'trainer' })}
            >
              Сохранить
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Удалить «{deleteTarget?.label}»?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={doDeleteClass}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )

  if (embedded) {
    return (
      <>
        {shell}
        {classDialogEl}
      </>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        '@supports (min-height: 100dvh)': {
          minHeight: '100dvh',
        },
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="sticky"
        color="inherit"
        elevation={1}
        sx={{
          bgcolor: 'background.paper',
          pt: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <Toolbar
          sx={{
            gap: 1,
            flexWrap: 'wrap',
            pl: { xs: 'max(16px, env(safe-area-inset-left, 0px))', sm: 2 },
            pr: { xs: 'max(16px, env(safe-area-inset-right, 0px))', sm: 2 },
          }}
        >
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
            Кабинет тренера
          </Typography>
          <Button component={RouterLink} to="/" size="small">
            На сайт
          </Button>
          <Button size="small" onClick={() => logout()}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>
      {shell}
      {classDialogEl}
    </Box>
  )
}
