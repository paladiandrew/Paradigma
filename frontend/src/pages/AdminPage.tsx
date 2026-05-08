import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditCalendarIcon from '@mui/icons-material/EditCalendar'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import ScheduleClassForm, { scheduleSaveAllowed, validateScheduleForm } from '../components/admin/ScheduleClassForm'
import { buildPreviewTariffFromEdit, TariffPreviewHomeStyle, TariffPreviewPageStyle } from '../components/admin/TariffAdminPreviews'
import { Link as RouterLink } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { datetimeLocalToIso, normalizeAdminPayloadDates, toDatetimeLocalValue } from '../utils/dateTimeLocal'
import PhoneTextField from '../components/PhoneTextField'
import { displayRuPhoneFromStored, ruPhoneToApi } from '../utils/ruPhoneFormat'

type TabType = 'general' | 'events' | 'news' | 'tariffs' | 'users' | 'logs' | 'schedule'

const tabs: Array<{ id: TabType; label: string }> = [
  { id: 'general', label: 'Общее' },
  { id: 'events', label: 'Акции' },
  { id: 'news', label: 'Новости' },
  { id: 'tariffs', label: 'Тарифы' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'users', label: 'Пользователи' },
  { id: 'logs', label: 'Логи' },
]

type DialogListRole = 'admins' | 'trainers' | null

const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const USER_ADMIN_DETAIL_KEYS = [
  'username',
  'phone',
  'email',
  'first_name',
  'last_name',
  'role',
  'specialty',
  'show_on_homepage',
  'is_phone_verified',
  'is_email_verified',
  'active_subscription_id',
  'created_at',
] as const

const DETAIL_FIELD_LABELS: Record<string, string> = {
  username: 'Логин',
  phone: 'Телефон',
  email: 'Email',
  first_name: 'Имя',
  last_name: 'Фамилия',
  role: 'Роль',
  specialty: 'Специализация',
  show_on_homepage: 'На главной',
  is_phone_verified: 'Телефон подтверждён',
  is_email_verified: 'Email подтверждён',
  active_subscription_id: 'Активный абонемент',
  created_at: 'Создан',
}

const SCHEDULE_DIRTY_KEYS = [
  'title',
  'category',
  'recurrence',
  'day_of_week',
  'time',
  'duration',
  'start_datetime',
  'trainer_id',
  'tariff_id',
  'max_capacity',
  'other_label',
  'trainer_name',
  'trainer_avatar',
  'repeat_weeks',
  'overrides',
] as const

function pickDirty<T extends Record<string, unknown>>(initial: T, current: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {}
  for (const k of keys) {
    const a = initial[k]
    const b = current[k]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out[k] = b
    }
  }
  return out
}

/** Тело ответа GET /admin/about или /site/about → строка для поля «Об академии». */
function aboutTextFromApiPayload(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>
  const raw = d.value ?? d.text
  if (raw == null) return ''
  return String(raw)
}

export default function AdminPage() {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [editInitial, setEditInitial] = useState<any>({})
  const [aboutValue, setAboutValue] = useState('')
  const [aboutInitial, setAboutInitial] = useState('')
  const [generalAdmins, setGeneralAdmins] = useState<any[]>([])
  const [generalTrainers, setGeneralTrainers] = useState<any[]>([])
  const [dialogListRole, setDialogListRole] = useState<DialogListRole>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; deleteKind?: 'trainer' } | null>(null)
  const [trainersList, setTrainersList] = useState<any[]>([])
  const [tariffsList, setTariffsList] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [occMap, setOccMap] = useState<Record<string, any[]>>({})
  const [moveDlg, setMoveDlg] = useState<{ classId: string; nominal: string; newDate: string; newTime: string } | null>(
    null,
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  /** Просмотр админа без редактирования (раздел «Админы» на вкладке «Общее») */
  const [dialogReadOnly, setDialogReadOnly] = useState(false)
  const [userSearchInput, setUserSearchInput] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [aboutLoading, setAboutLoading] = useState(false)
  const [generalListsLoading, setGeneralListsLoading] = useState(false)

  const closeEditDialog = () => {
    setEditOpen(false)
    setFieldErrors({})
    setDialogReadOnly(false)
    setDialogListRole(null)
  }

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const endpoint = useMemo(() => {
    const map: Record<TabType, string> = {
      general: '',
      events: '/admin/events',
      news: '/admin/events',
      tariffs: '/admin/tariffs',
      schedule: '/admin/schedule',
      users: '/admin/users',
      logs: '/admin/logs',
    }
    return map[activeTab]
  }, [activeTab])

  const loadGeneralData = useCallback(async () => {
    setAboutLoading(true)
    setGeneralListsLoading(true)
    try {
      const ab = await api.get('/admin/about')
      const v = aboutTextFromApiPayload(ab.data)
      setAboutValue(v)
      setAboutInitial(v)
    } catch {
      toast.error('Не удалось загрузить текст «Об академии» из базы')
    } finally {
      setAboutLoading(false)
    }
    try {
      const [adm, tr] = await Promise.all([api.get('/admin/admins'), api.get('/admin/trainers')])
      setGeneralAdmins(adm.data || [])
      setGeneralTrainers(tr.data || [])
    } catch {
      toast.error('Не удалось загрузить списки админов или тренеров')
    } finally {
      setGeneralListsLoading(false)
    }
  }, [])

  const loadData = useCallback(async () => {
    if (activeTab === 'general') return
    setLoading(true)
    try {
      if (activeTab === 'events') {
        const res = await api.get('/admin/events', { params: { type: 'promotion' } })
        setItems(res.data || [])
        return
      }
      if (activeTab === 'news') {
        const res = await api.get('/admin/events', { params: { type: 'news' } })
        setItems(res.data || [])
        return
      }
      const res = await api.get(endpoint)
      setItems(res.data || [])
    } finally {
      setLoading(false)
    }
  }, [activeTab, endpoint])

  const reloadAfterMutation = useCallback(async () => {
    if (activeTab === 'general') await loadGeneralData()
    else await loadData()
  }, [activeTab, loadData, loadGeneralData])

  useEffect(() => {
    if (activeTab === 'general') loadGeneralData()
    else loadData()
  }, [activeTab, loadData, loadGeneralData])

  useEffect(() => {
    if (activeTab === 'schedule') {
      api.get('/admin/trainers').then((r) => setTrainersList(r.data || []))
      api.get('/admin/tariffs').then((r) => setTariffsList(r.data || []))
    }
    if (activeTab === 'events' || activeTab === 'news') {
      api.get('/admin/tariffs').then((r) => setTariffsList(r.data || []))
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'users') {
      setUserSearchInput('')
      setUserSearchQuery('')
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'schedule' || !expandedId) return
    let cancelled = false
    api
      .get(`/admin/schedule/${expandedId}/occurrences`, { params: { weeks: 4 } })
      .then((r) => {
        if (!cancelled) setOccMap((m) => ({ ...m, [expandedId]: r.data || [] }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [expandedId, activeTab])

  const scheduleAddBlocked = activeTab === 'schedule' && (!trainersList.length || !tariffsList.length)

  const pushScheduleOverride = async (classId: string, row: Record<string, unknown>) => {
    const item = items.find((i) => String(i.id) === classId)
    const prev = Array.isArray(item?.overrides) ? [...item.overrides] : []
    const next = [...prev, row]
    await toast.promise(api.put(`/admin/schedule/${classId}`, { overrides: next }), {
      loading: 'Сохранение…',
      success: 'Обновлено',
      error: 'Ошибка',
    })
    await loadData()
    const r = await api.get(`/admin/schedule/${classId}/occurrences`, { params: { weeks: 4 } })
    setOccMap((m) => ({ ...m, [classId]: r.data || [] }))
  }

  const openCreate = () => {
    setFieldErrors({})
    setDialogReadOnly(false)
    setDialogListRole(null)
    setEditInitial({})
    if (activeTab === 'events') {
      setEditData({
        type: 'promotion',
        title: '',
        description: '',
        date: toDatetimeLocalValue(new Date()),
        end_date: '',
        linked_tariff_id: '',
      })
    } else if (activeTab === 'news') {
      setEditData({
        type: 'news',
        title: '',
        description: '',
        date: toDatetimeLocalValue(new Date()),
        image_url: '',
        linked_tariff_id: '',
      })
    } else if (activeTab === 'schedule') {
      setEditData({
        title: '',
        category: 'trainer',
        recurrence: 'weekly',
        day_of_week: 1,
        time: '18:00',
        duration: 60,
        start_datetime: '',
        trainer_id: '',
        tariff_id: '',
        max_capacity: null,
        other_label: '',
        repeat_weeks: null,
      })
    } else if (activeTab === 'tariffs') {
      setEditData({
        name: '',
        description: '',
        price: 0,
        duration_days: 30,
        trainings_count: 8,
        discount_percent: 0,
        discount_until: '',
        popular: false,
        features: [],
        bonuses: [],
      })
    } else {
      setEditData({})
    }
    setEditOpen(true)
  }

  const openEdit = (row: any, opts?: { readOnly?: boolean; listRole?: 'admins' | 'trainers' }) => {
    setFieldErrors({})
    setDialogReadOnly(opts?.readOnly ?? false)
    setDialogListRole(opts?.listRole ?? null)
    const copy = JSON.parse(JSON.stringify(row))
    const rawId = copy.id ?? copy._id
    if (rawId != null && rawId !== '') copy.id = String(rawId)
    else delete copy.id
    delete copy._id
    if (copy.start_datetime) {
      copy.start_datetime = toDatetimeLocalValue(copy.start_datetime)
    }
    if (copy.date) {
      copy.date = toDatetimeLocalValue(copy.date)
    }
    if (copy.end_date) {
      copy.end_date = toDatetimeLocalValue(copy.end_date)
    }
    if (copy.discount_until) {
      copy.discount_until = toDatetimeLocalValue(copy.discount_until)
    }
    if (copy.phone) {
      copy.phone = displayRuPhoneFromStored(copy.phone)
    }
    if (activeTab === 'tariffs') {
      if (!Array.isArray(copy.features)) copy.features = []
      if (!Array.isArray(copy.bonuses)) copy.bonuses = []
    }
    if (activeTab === 'schedule') {
      copy.repeat_weeks = copy.repeat_weeks ?? null
      if (copy.max_capacity === undefined || copy.max_capacity === '') copy.max_capacity = null
      copy.category = 'trainer'
    }
    setEditInitial(copy)
    setEditData(copy)
    setEditOpen(true)
  }

  const saveEntity = async () => {
    setFieldErrors({})
    const base = endpoint
    const editingHasId =
      Boolean(editData?.id ?? (editData as any)?._id) && String(editData?.id ?? (editData as any)?._id) !== ''
    if (activeTab === 'schedule') {
      const err = validateScheduleForm(editData as Record<string, unknown>)
      if (Object.keys(err).length) {
        setFieldErrors(err)
        return
      }
    }
    if (activeTab === 'users' || dialogListRole === 'admins') {
      const uid = String(editData.id ?? (editData as any)._id ?? '')
      await toast.promise(api.put(`/admin/users/${uid}/role`, { role: editData.role }), {
        loading: 'Сохранение…',
        success: 'Роль обновлена',
        error: 'Ошибка',
      })
      closeEditDialog()
      await reloadAfterMutation()
      return
    }

    if (dialogListRole === 'trainers') {
      if (hasEntityId) {
        const uid = String(editData.id ?? (editData as any)._id ?? '')
        const roleChanged = String(editInitial.role ?? '') !== String(editData.role ?? '')
        const keys = (Object.keys(editInitial).length ? Object.keys(editInitial) : Object.keys(editData)) as string[]
        let payload = pickDirty(editInitial, editData, keys as any)
        delete (payload as any).password
        delete (payload as any).id
        delete (payload as any)._id
        delete (payload as any).role
        if (payload.phone != null) payload.phone = ruPhoneToApi(String(payload.phone))
        if (!roleChanged && Object.keys(payload).length === 0) {
          toast('Нет изменений')
          return
        }
        await toast.promise(
          (async () => {
            if (roleChanged) {
              await api.put(`/admin/users/${uid}/role`, { role: editData.role })
            }
            if (Object.keys(payload).length > 0) {
              await api.put(`/users/${uid}`, payload)
            }
          })(),
          {
            loading: 'Сохранение…',
            success: 'Сохранено',
            error: 'Ошибка',
          },
        )
      } else {
        await toast.promise(
          api.post('/admin/trainers', {
            username: String(editData.username || '').trim().toLowerCase(),
            password: editData.password,
            first_name: editData.first_name,
            last_name: editData.last_name,
            email: editData.email || null,
            phone: ruPhoneToApi(String(editData.phone || '')) || null,
            specialty: editData.specialty || null,
          }),
          { loading: 'Создание…', success: 'Тренер создан', error: 'Ошибка' },
        )
      }
      closeEditDialog()
      await reloadAfterMutation()
      return
    }

    const body: Record<string, unknown> = { ...editData }
    if (activeTab === 'schedule' && body.start_datetime === '') body.start_datetime = null
    if (activeTab === 'schedule' && (body.repeat_weeks === '' || body.repeat_weeks === undefined)) {
      body.repeat_weeks = null
    }
    if (activeTab === 'schedule' && (body.max_capacity === '' || body.max_capacity === undefined)) {
      body.max_capacity = null
    }
    if (activeTab === 'events') body.type = 'promotion'
    if (activeTab === 'news') {
      body.type = 'news'
      body.end_date = null
    }
    if (activeTab === 'tariffs') {
      const feat = Array.isArray(body.features) ? body.features : []
      const bon = Array.isArray(body.bonuses) ? body.bonuses : []
      body.features = feat.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 3)
      body.bonuses = bon.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 2)
    }

    const entityId = body.id ?? (body as any)._id
    const idStr = entityId != null && entityId !== '' ? String(entityId) : ''

    if (idStr) {
      let payload: any = body
      if (['tariffs', 'events', 'news', 'schedule'].includes(activeTab)) {
        const keys =
          activeTab === 'schedule'
            ? ([...SCHEDULE_DIRTY_KEYS] as string[])
            : ((Object.keys(editInitial).length ? Object.keys(editInitial) : Object.keys(body)) as string[])
        payload = pickDirty(editInitial, body, keys as any)
        if (activeTab === 'schedule') {
          const rec = String(body.recurrence || '')
          if (rec === 'once' && body.start_datetime != null && String(body.start_datetime).trim() !== '') {
            payload = { ...payload, start_datetime: body.start_datetime }
          }
        }
        if (Object.keys(payload).length === 0) {
          if (activeTab !== 'schedule') toast('Нет изменений')
          return
        }
      }
      delete payload.id
      delete (payload as any)._id
      normalizeAdminPayloadDates(activeTab, payload)
      await toast.promise(api.put(`${base}/${idStr}`, payload), {
        loading: 'Сохранение…',
        success: 'Обновлено',
        error: 'Ошибка сохранения',
      })
    } else {
      const { id: _i, _id: __i, ...createBody } = body as any
      normalizeAdminPayloadDates(activeTab, createBody)
      await toast.promise(api.post(base, createBody), {
        loading: 'Создание…',
        success: 'Создано',
        error: 'Ошибка создания',
      })
    }
    closeEditDialog()
    await reloadAfterMutation()
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    let delUrl = ''
    if (deleteTarget.deleteKind === 'trainer') delUrl = `/admin/trainers/${deleteTarget.id}`
    else delUrl = `${endpoint}/${deleteTarget.id}`
    await toast.promise(api.delete(delUrl), {
      loading: 'Удаление…',
      success: 'Удалено',
      error: 'Ошибка удаления',
    })
    setDeleteTarget(null)
    await reloadAfterMutation()
  }

  const hasEntityId = Boolean(editData?.id ?? (editData as any)?._id) && String(editData?.id ?? (editData as any)?._id) !== ''
  const isDirty =
    activeTab === 'users' || dialogListRole === 'admins'
      ? editInitial.role !== editData.role
      : !hasEntityId
        ? JSON.stringify(editData) !== '{}'
        : JSON.stringify(editInitial) !== JSON.stringify(editData)

  const applyUserSearch = () => {
    setUserSearchQuery(userSearchInput.trim())
  }

  const listForCards = useMemo(() => {
    if (activeTab !== 'users') return items
    const q = userSearchQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter((u: any) => {
      if (u.role != null && u.role !== 'user') return false
      const un = String(u.username || '').toLowerCase()
      const ln = String(u.last_name || '').toLowerCase()
      return un.includes(q) || ln.includes(q)
    })
  }, [items, activeTab, userSearchQuery])

  const cardGrid = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(3, minmax(0,1fr))' },
        gap: 2,
        alignContent: 'start',
      }}
    >
      {listForCards.map((item, index) => {
        const id = item.id ?? (item as any)._id
        let title = ''
        let sub = ''
        if (activeTab === 'tariffs') {
          title = item.name || '—'
          sub = `${item.price?.toLocaleString?.('ru-RU') ?? item.price} ₽`
        } else if (activeTab === 'users') {
          title = [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Без имени'
          sub = id != null ? `id: ${id}` : '—'
        } else if (activeTab === 'events' || activeTab === 'news') {
          title = item.title || '—'
          sub = item.date ? new Date(item.date).toLocaleDateString('ru-RU') : ''
        } else if (activeTab === 'schedule') {
          title = item.title || item.trainer_name || 'Занятие'
          sub = `${daysShort[item.day_of_week ?? 0]} · ${item.time || ''} · ${item.recurrence || ''}`
        } else {
          title = String(id)
        }
        const expanded = expandedId === id && activeTab === 'schedule'
        return (
          <Card
            key={id != null && id !== '' ? String(id) : `row-${index}`}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 4 },
            }}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
              {activeTab === 'schedule' && (
                <Collapse in={expanded}>
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, fontSize: 13 }}>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      Категория: {item.category === 'other' ? 'Иное' : 'Тренер'} · повтор: {item.recurrence}
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      Ближайшие даты (4 недели)
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 0.5, mt: 0.5, maxHeight: 220, overflow: 'auto' }}>
                      {(occMap[String(id)] || []).map((occ: any) => (
                        <Box
                          key={occ.nominal_starts_at}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              textDecoration: occ.cancelled ? 'line-through' : 'none',
                              opacity: occ.cancelled ? 0.6 : 1,
                            }}
                          >
                            {occ.cancelled
                              ? new Date(occ.nominal_starts_at).toLocaleString('ru-RU')
                              : new Date(occ.display_starts_at).toLocaleString('ru-RU')}
                            {occ.moved && !occ.cancelled ? ' (перенос)' : ''}
                          </Typography>
                          {!occ.cancelled && (
                            <>
                              <Tooltip title="Отменить это вхождение">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    pushScheduleOverride(String(id), {
                                      date: occ.nominal_starts_at,
                                      action: 'cancel',
                                      new_date: null,
                                      new_time: null,
                                    })
                                  }
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Перенести">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setMoveDlg({
                                      classId: String(id),
                                      nominal: occ.nominal_starts_at,
                                      newDate: toDatetimeLocalValue(occ.display_starts_at).slice(0, 10),
                                      newTime: '18:00',
                                    })
                                  }
                                >
                                  <EditCalendarIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      ))}
                    </Box>
                    {item.tariff_id && (
                      <Button size="small" component={RouterLink} to={`/tariffs?focus=${item.tariff_id}`} sx={{ mt: 1 }}>
                        Открыть тариф
                      </Button>
                    )}
                  </Box>
                </Collapse>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1, flexWrap: 'wrap' }}>
                <>
                  <Button size="small" variant="outlined" onClick={() => openEdit(item)}>
                    Изменить
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={id == null || String(id) === ''}
                    onClick={() => setDeleteTarget({ id: String(id), label: title })}
                  >
                    Удалить
                  </Button>
                </>
                {activeTab === 'schedule' && (
                  <Button size="small" onClick={() => setExpandedId((v) => (v === id ? null : id))}>
                    {expanded ? 'Свернуть' : 'Подробнее'}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )

  const logsTable = (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {items.map((log: any) => (
        <Card key={log.id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="body2">
              {log.created_at} — {log.action} / {log.entity_type}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  )

  const uploadNewsImage = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    await toast.promise(
      api.post<{ url: string }>('/admin/upload/news-image', fd).then((r) => {
        setEditData((p: any) => ({ ...p, image_url: r.data.url }))
      }),
      { loading: 'Загрузка…', success: 'Изображение загружено', error: 'Ошибка загрузки' },
    )
  }

  const saveAbout = async () => {
    await toast.promise(api.put('/admin/about', { value: aboutValue }), {
      loading: 'Сохранение…',
      success: 'Сохранено',
      error: 'Ошибка',
    })
    setAboutInitial(aboutValue)
    try {
      const r = await api.get('/admin/about')
      const v = aboutTextFromApiPayload(r.data)
      setAboutValue(v)
      setAboutInitial(v)
    } catch {
      /* уже сохранено */
    }
  }

  const personCardsGridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
    gap: 2,
    alignContent: 'start',
  } as const

  const renderGeneralPersonCards = (list: any[], mode: 'admin' | 'trainer') => (
    <Box sx={personCardsGridSx}>
      {list.map((item, index) => {
        const id = item.id ?? (item as any)._id
        const title = [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Без имени'
        const sub = id != null ? `id: ${id}` : '—'
        return (
          <Card
            key={id != null && id !== '' ? String(id) : `row-${index}`}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 4 },
            }}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1, flexWrap: 'wrap' }}>
                {mode === 'admin' ? (
                  <Button size="small" variant="outlined" onClick={() => openEdit(item, { readOnly: true, listRole: 'admins' })}>
                    Подробнее
                  </Button>
                ) : (
                  <Button size="small" variant="outlined" onClick={() => openEdit(item, { listRole: 'trainers' })}>
                    Изменить
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )

  const shellContent = (
    <>
      {activeTab === 'general' ? (
        <Box sx={{ maxWidth: 960, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
            Об академии
          </Typography>
          <TextField
            multiline
            minRows={10}
            fullWidth
            value={aboutValue}
            onChange={(e) => setAboutValue(e.target.value)}
            disabled={aboutLoading}
            placeholder="Текст для блока «Об академии» на главной странице. Абзацы разделяйте пустой строкой."
            helperText={
              aboutLoading
                ? 'Загрузка текста из базы данных…'
                : 'Текст хранится в базе (ключ site_contents, about) и показывается на главной.'
            }
          />
          <Button
            variant="contained"
            color="secondary"
            disabled={aboutLoading || aboutValue === aboutInitial}
            sx={{ mt: 2, alignSelf: 'center' }}
            onClick={saveAbout}
          >
            Сохранить
          </Button>

          <Box sx={{ height: 40 }} />

          {generalListsLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1.5 }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary">
                Загрузка списков админов и тренеров…
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
                Админы
              </Typography>
              {renderGeneralPersonCards(generalAdmins, 'admin')}

              <Box sx={{ height: 40 }} />

              <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
                Тренеры
              </Typography>
              {renderGeneralPersonCards(generalTrainers, 'trainer')}
            </>
          )}
        </Box>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : activeTab === 'logs' ? (
        logsTable
      ) : (
        <>
          {activeTab === 'events' ? (
            <Typography
              variant="h5"
              component="p"
              textAlign="center"
              sx={{
                mb: 4,
                mt: 1,
                px: 2,
                fontWeight: 700,
                color: 'text.primary',
                maxWidth: 800,
                mx: 'auto',
                lineHeight: 1.5,
              }}
            >
              На данный момент скидка на тарифы регулируется в настройках тарифа.
            </Typography>
          ) : null}
          {activeTab === 'users' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, width: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 1.5,
                  maxWidth: 560,
                  width: '100%',
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="medium"
                  placeholder="Логин или фамилия (можно частично)"
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyUserSearch()
                    }
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      '& fieldset': {
                        borderWidth: 2,
                        borderColor: 'rgba(0,0,0,0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'secondary.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderWidth: 2,
                        borderColor: 'secondary.main',
                      },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'text.secondary',
                      opacity: 1,
                    },
                  }}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={applyUserSearch}
                  sx={{
                    minWidth: 120,
                    flexShrink: 0,
                    fontWeight: 700,
                    boxShadow: 2,
                  }}
                >
                  Поиск
                </Button>
              </Box>
            </Box>
          ) : null}
          {cardGrid}
        </>
      )}
    </>
  )

  const sidebar = (
    <Box
      sx={{
        width: 260,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          background: 'linear-gradient(135deg, rgba(227, 6, 19, 0.12) 0%, rgba(227, 6, 19, 0.02) 100%)',
          borderLeft: '4px solid',
          borderLeftColor: 'secondary.main',
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: 2, color: 'secondary.dark', fontWeight: 700 }}>
          PARADIGMA
        </Typography>
        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1, color: 'text.primary' }}>
          Admin
        </Typography>
      </Box>
      <List dense sx={{ flex: 1, py: 1, overflow: 'auto' }}>
        {tabs.map((tab) => (
          <ListItemButton
            key={tab.id}
            selected={tab.id === activeTab}
            onClick={() => {
              setActiveTab(tab.id)
              setMobileMenuOpen(false)
            }}
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              borderLeft: '3px solid transparent',
              '&.Mui-selected': {
                bgcolor: 'rgba(227, 6, 19, 0.1)',
                borderLeftColor: 'secondary.main',
                '&:hover': { bgcolor: 'rgba(227, 6, 19, 0.14)' },
              },
            }}
          >
            <ListItemText
              primary={tab.label}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: tab.id === activeTab ? 700 : 500,
                color: tab.id === activeTab ? 'secondary.dark' : 'text.primary',
              }}
            />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button fullWidth variant="outlined" color="secondary" onClick={logout}>
          Выйти
        </Button>
      </Box>
    </Box>
  )

  return (
    <Box
      sx={{
        height: '100vh',
        '@supports (height: 100dvh)': {
          height: '100dvh',
        },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'grey.50',
        backgroundImage: 'linear-gradient(180deg, rgba(227, 6, 19, 0.04) 0%, transparent 28%)',
      }}
    >
      {isMobile && (
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: '#111',
            color: 'common.white',
            borderBottom: '3px solid',
            borderColor: 'secondary.main',
            pt: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <Toolbar
            sx={{
              pl: 'max(8px, env(safe-area-inset-left, 0px))',
              pr: 'max(8px, env(safe-area-inset-right, 0px))',
            }}
          >
            <IconButton onClick={() => setMobileMenuOpen(true)} sx={{ color: 'common.white' }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 800, flex: 1 }}>
              Paradigma <Box component="span" sx={{ color: 'secondary.main' }}>·</Box> админ
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {!isMobile && sidebar}
        <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
          {sidebar}
        </Drawer>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {!isMobile && (
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: '3px solid',
                borderColor: 'secondary.main',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 4px 18px rgba(227, 6, 19, 0.08)',
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: 'linear-gradient(145deg, #1a1a1a 0%, #000 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'secondary.main',
                  fontWeight: 900,
                  fontSize: 14,
                  userSelect: 'none',
                  border: '2px solid',
                  borderColor: 'secondary.main',
                }}
              >
                PB
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary' }}>
                  {tabs.find((t) => t.id === activeTab)?.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 600 }}>
                  Панель управления контентом и расписанием
                </Typography>
              </Box>
            </Box>
          )}

          <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                mb: 2,
              }}
            >
              {activeTab === 'schedule' && scheduleAddBlocked && (
                <>
                  <Button variant="outlined" color="primary" onClick={() => setActiveTab('users')}>
                    Назначить тренера
                  </Button>
                  <Button variant="outlined" color="primary" onClick={() => setActiveTab('tariffs')}>
                    Создать тариф
                  </Button>
                </>
              )}
              {['news', 'tariffs', 'schedule'].includes(activeTab) && (
                <Tooltip
                  title={scheduleAddBlocked ? 'Сначала добавьте хотя бы одного тренера и один тариф' : ''}
                  disableHoverListener={!scheduleAddBlocked}
                >
                  <span>
                    <Button variant="contained" color="secondary" onClick={openCreate} disabled={scheduleAddBlocked}>
                      Добавить
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
            {shellContent}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={editOpen}
        onClose={closeEditDialog}
        fullWidth
        maxWidth="md"
        slotProps={{ paper: { sx: { overflow: 'visible' } } }}
      >
        {activeTab === 'schedule' ? (
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
                {!hasEntityId ? <AddCircleOutlineIcon color="secondary" fontSize="small" /> : null}
                <Typography variant="h6" component="span" fontWeight={700}>
                  {hasEntityId ? 'Редактирование занятия' : 'Новое занятие'}
                </Typography>
              </Box>
              {hasEntityId ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {editData.title || '—'}
                </Typography>
              ) : null}
            </Box>
            <IconButton aria-label="Закрыть" onClick={closeEditDialog} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
        ) : (
          <DialogTitle sx={{ pb: 1 }}>
            {dialogListRole === 'admins' && dialogReadOnly
              ? 'Администратор'
              : hasEntityId
                ? 'Редактирование'
                : 'Создание'}
          </DialogTitle>
        )}
        <DialogContent
          sx={
            activeTab === 'schedule'
              ? { p: 0, overflow: 'visible' }
              : { display: 'grid', gap: 2, pt: 2.5, px: 3, pb: 2, overflow: 'visible' }
          }
        >
          {activeTab === 'tariffs' && (
            <>
              <TextField
                required
                label="Название *"
                variant="outlined"
                fullWidth
                value={editData.name || ''}
                onChange={(e) => setEditData((p: any) => ({ ...p, name: e.target.value }))}
              />
              <TextField
                label="Цена, ₽ *"
                variant="outlined"
                fullWidth
                type="number"
                value={editData.price ?? ''}
                onChange={(e) => setEditData((p: any) => ({ ...p, price: Number(e.target.value) }))}
              />
              <TextField
                label="Описание"
                variant="outlined"
                fullWidth
                value={editData.description || ''}
                onChange={(e) => setEditData((p: any) => ({ ...p, description: e.target.value }))}
                multiline
                rows={3}
              />
              <TextField
                label="Длительность, дней"
                variant="outlined"
                fullWidth
                type="number"
                value={editData.duration_days ?? 30}
                onChange={(e) => setEditData((p: any) => ({ ...p, duration_days: Number(e.target.value) }))}
              />
              <TextField
                label="Количество занятий в абонементе"
                variant="outlined"
                fullWidth
                type="number"
                value={editData.trainings_count ?? 8}
                onChange={(e) => setEditData((p: any) => ({ ...p, trainings_count: Number(e.target.value) }))}
              />
              <TextField
                label="Скидка %"
                variant="outlined"
                fullWidth
                type="number"
                inputProps={{ min: 0, max: 100 }}
                value={editData.discount_percent ?? 0}
                onChange={(e) => setEditData((p: any) => ({ ...p, discount_percent: Number(e.target.value) }))}
              />
              <TextField
                label="Скидка действует до"
                variant="outlined"
                fullWidth
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={editData.discount_until || ''}
                onChange={(e) => setEditData((p: any) => ({ ...p, discount_until: e.target.value }))}
                inputProps={{ step: 60 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(editData.popular)}
                    onChange={(e) => setEditData((p: any) => ({ ...p, popular: e.target.checked }))}
                  />
                }
                label="Популярный тариф"
              />
              <Typography variant="subtitle2" color="text.secondary">
                Возможности (не более 3)
              </Typography>
              {(editData.features || []).map((line: string, i: number) => (
                <TextField
                  key={i}
                  label={`Возможность ${i + 1}`}
                  variant="outlined"
                  fullWidth
                  value={line}
                  onChange={(e) => {
                    const next = [...(editData.features || [])]
                    next[i] = e.target.value
                    setEditData((p: any) => ({ ...p, features: next }))
                  }}
                />
              ))}
              <Button
                variant="outlined"
                size="small"
                disabled={(editData.features || []).length >= 3}
                onClick={() =>
                  setEditData((p: any) => ({
                    ...p,
                    features: [...(p.features || []), ''],
                  }))
                }
              >
                Добавить возможность
              </Button>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                Бонусы (не более 2)
              </Typography>
              {(editData.bonuses || []).map((line: string, i: number) => (
                <TextField
                  key={i}
                  label={`Бонус ${i + 1}`}
                  variant="outlined"
                  fullWidth
                  value={line}
                  onChange={(e) => {
                    const next = [...(editData.bonuses || [])]
                    next[i] = e.target.value
                    setEditData((p: any) => ({ ...p, bonuses: next }))
                  }}
                />
              ))}
              <Button
                variant="outlined"
                size="small"
                disabled={(editData.bonuses || []).length >= 2}
                onClick={() =>
                  setEditData((p: any) => ({
                    ...p,
                    bonuses: [...(p.bonuses || []), ''],
                  }))
                }
              >
                Добавить бонус
              </Button>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }} fontWeight={700}>
                Предпросмотр — главная страница
              </Typography>
              <TariffPreviewHomeStyle tariff={buildPreviewTariffFromEdit(editData)} />
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }} fontWeight={700}>
                Предпросмотр — страница тарифов
              </Typography>
              <TariffPreviewPageStyle tariff={buildPreviewTariffFromEdit(editData)} />
            </>
          )}
          {dialogListRole === 'trainers' && (
            <>
              {!hasEntityId && (
                <>
                  <TextField
                    label="Логин"
                    value={editData.username || ''}
                    onChange={(e) => setEditData((p: any) => ({ ...p, username: e.target.value }))}
                    required
                  />
                  <TextField
                    label="Пароль"
                    type="password"
                    value={editData.password || ''}
                    onChange={(e) => setEditData((p: any) => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <TextField label="Имя" value={editData.first_name || ''} onChange={(e) => setEditData((p: any) => ({ ...p, first_name: e.target.value }))} />
                  <TextField label="Фамилия" value={editData.last_name || ''} onChange={(e) => setEditData((p: any) => ({ ...p, last_name: e.target.value }))} />
                  <TextField label="Email" type="email" value={editData.email || ''} onChange={(e) => setEditData((p: any) => ({ ...p, email: e.target.value }))} />
                  <PhoneTextField
                    label="Телефон"
                    value={editData.phone || ''}
                    onValueChange={(phone) => setEditData((p: any) => ({ ...p, phone }))}
                  />
                  <TextField label="Специализация" value={editData.specialty || ''} onChange={(e) => setEditData((p: any) => ({ ...p, specialty: e.target.value }))} />
                  <TextField
                    label="О себе (главная)"
                    value={editData.trainer_bio || ''}
                    onChange={(e) => setEditData((p: any) => ({ ...p, trainer_bio: e.target.value }))}
                    multiline
                    rows={4}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(editData.show_on_homepage)}
                        onChange={(e) => setEditData((p: any) => ({ ...p, show_on_homepage: e.target.checked }))}
                      />
                    }
                    label="Показывать на главной странице"
                  />
                </>
              )}
              {hasEntityId && (
                <>
                  {(
                    [
                      { key: 'id', label: 'ID', kind: 'readonly' as const },
                      { key: 'username', label: 'Логин', kind: 'readonly' as const },
                      { key: 'email', label: 'Email', kind: 'readonly' as const },
                      { key: 'phone', label: 'Телефон', kind: 'readonly' as const },
                      { key: 'first_name', label: 'Имя', kind: 'readonly' as const },
                      { key: 'last_name', label: 'Фамилия', kind: 'readonly' as const },
                      { key: 'specialty', label: 'Специализация', kind: 'text' as const },
                      { key: 'trainer_bio', label: 'О себе (главная)', kind: 'multiline' as const },
                      { key: 'created_at', label: 'Создан', kind: 'readonly' as const },
                    ] as const
                  ).map((row) => (
                    <Box
                      key={row.key}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        py: 0.75,
                        borderBottom: 1,
                        borderColor: 'divider',
                        alignItems: row.kind === 'multiline' ? 'flex-start' : 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0, pt: row.kind === 'multiline' ? 1 : 0 }}>
                        {row.label}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {row.kind === 'readonly' && row.key === 'phone' && (
                          <Box
                            sx={{
                              flex: 1,
                              display: 'flex',
                              justifyContent: 'flex-end',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-all' }}>
                              {String((editData as any)[row.key] ?? '—')}
                            </Typography>
                          </Box>
                        )}
                        {row.kind === 'readonly' && row.key !== 'phone' && (
                          <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-all' }}>
                            {String((editData as any)[row.key] ?? '—')}
                          </Typography>
                        )}
                        {row.kind === 'text' && (
                          <TextField
                            size="small"
                            fullWidth
                            value={(editData as any)[row.key] || ''}
                            onChange={(e) => setEditData((p: any) => ({ ...p, [row.key]: e.target.value }))}
                          />
                        )}
                        {row.kind === 'multiline' && (
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            minRows={3}
                            value={editData.trainer_bio || ''}
                            onChange={(e) => setEditData((p: any) => ({ ...p, trainer_bio: e.target.value }))}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      py: 0.75,
                      borderBottom: 1,
                      borderColor: 'divider',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0 }}>
                      Роль
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={editData.role || 'trainer'}
                          onChange={(e) => setEditData((p: any) => ({ ...p, role: e.target.value }))}
                          displayEmpty
                          inputProps={{ 'aria-label': 'Роль' }}
                        >
                          <MenuItem value="user">Пользователь</MenuItem>
                          <MenuItem value="trainer">Тренер</MenuItem>
                          <MenuItem value="admin">Администратор</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      py: 0.75,
                      borderBottom: 1,
                      borderColor: 'divider',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0 }}>
                      На главной
                    </Typography>
                    <FormControlLabel
                      sx={{ flex: 1, justifyContent: 'flex-end', m: 0 }}
                      control={
                        <Switch
                          checked={Boolean(editData.show_on_homepage)}
                          onChange={(e) => setEditData((p: any) => ({ ...p, show_on_homepage: e.target.checked }))}
                        />
                      }
                      label=""
                    />
                  </Box>
                </>
              )}
            </>
          )}
          {activeTab === 'events' && (
            <>
              <Typography variant="caption" color="text.secondary">
                Тип записи: акция (promotion), отображается на главной.
              </Typography>
              <TextField label="Заголовок" value={editData.title || ''} onChange={(e) => setEditData((p: any) => ({ ...p, title: e.target.value }))} />
              <TextField label="Описание" value={editData.description || ''} onChange={(e) => setEditData((p: any) => ({ ...p, description: e.target.value }))} multiline rows={4} />
              <TextField
                label="Дата и время публикации"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={editData.date || ''}
                onChange={(e) => setEditData((p: any) => ({ ...p, date: e.target.value }))}
                inputProps={{ step: 60 }}
              />
              <TextField
                label="Окончание акции (необязательно)"
                variant="outlined"
                fullWidth
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={editData.end_date || ''}
                onChange={(e) => setEditData((p: any) => ({ ...p, end_date: e.target.value }))}
                helperText="После этой даты блок на главной скрывается"
                inputProps={{ step: 60 }}
              />
              <FormControl fullWidth>
                <InputLabel>Связанный тариф (акция)</InputLabel>
                <Select
                  label="Связанный тариф (акция)"
                  value={
                    editData.linked_tariff_id != null && editData.linked_tariff_id !== ''
                      ? String(editData.linked_tariff_id)
                      : ''
                  }
                  displayEmpty
                  renderValue={(selected) => {
                    if (selected === '' || selected == null) return <em>Не выбран</em>
                    const t = tariffsList.find((x) => String(x.id) === String(selected))
                    return t?.name ?? String(selected)
                  }}
                  onChange={(e) =>
                    setEditData((p: any) => ({
                      ...p,
                      linked_tariff_id: e.target.value ? String(e.target.value) : null,
                    }))
                  }
                >
                  <MenuItem value="">
                    <em>Не выбран</em>
                  </MenuItem>
                  {tariffsList.map((t) => (
                    <MenuItem key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
          {activeTab === 'news' && (
            <>
              <Typography variant="caption" color="text.secondary">
                Тип записи: новость, отображается в разделе «Новости».
              </Typography>
              <TextField label="Заголовок" value={editData.title || ''} onChange={(e) => setEditData((p: any) => ({ ...p, title: e.target.value }))} />
              <TextField label="Описание" value={editData.description || ''} onChange={(e) => setEditData((p: any) => ({ ...p, description: e.target.value }))} multiline rows={4} />
              <TextField
                label="Дата и время публикации"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={editData.date || ''}
                onChange={(e) => setEditData((p: any) => ({ ...p, date: e.target.value }))}
                inputProps={{ step: 60 }}
              />
              <Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
                Загрузить изображение
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void uploadNewsImage(f)
                  }}
                />
              </Button>
              <Typography variant="subtitle2" sx={{ mt: 1 }} fontWeight={700}>
                Предпросмотр новости
              </Typography>
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                {editData.image_url ? (
                  <Box
                    component="img"
                    src={editData.image_url}
                    alt=""
                    sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 1, mb: 1.5, display: 'block' }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Нет изображения
                  </Typography>
                )}
                <Typography variant="h6" fontWeight={700}>
                  {editData.title?.trim() ? editData.title : 'Заголовок новости'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {(editData.description || '').trim()
                    ? (editData.description || '').length > 280
                      ? `${String(editData.description).slice(0, 280)}…`
                      : editData.description
                    : 'Текст новости'}
                </Typography>
              </Card>
            </>
          )}
          {activeTab === 'schedule' && (
            <ScheduleClassForm
              editData={editData}
              setEditData={setEditData}
              fieldErrors={fieldErrors}
              trainersList={trainersList}
              tariffsList={tariffsList}
            />
          )}
          {(activeTab === 'users' || dialogListRole === 'admins') && (
            <>
              {USER_ADMIN_DETAIL_KEYS.filter((key) => key !== 'role').map((key) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
                    {DETAIL_FIELD_LABELS[key] ?? key}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-all' }}>
                    {String((editData as any)[key] ?? '—')}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5, borderBottom: 1, borderColor: 'divider', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
                  {DETAIL_FIELD_LABELS.role}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 220 }} disabled={dialogReadOnly}>
                  <InputLabel>Роль</InputLabel>
                  <Select
                    value={editData.role || 'user'}
                    label="Роль"
                    onChange={(e) => setEditData((p: any) => ({ ...p, role: e.target.value }))}
                  >
                    <MenuItem value="user">Пользователь</MenuItem>
                    <MenuItem value="trainer">Тренер</MenuItem>
                    <MenuItem value="admin">Администратор</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: activeTab === 'schedule' ? 0 : undefined,
            justifyContent: activeTab === 'schedule' ? 'space-between' : 'flex-end',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {activeTab === 'schedule' ? (
            <>
              <Button variant="outlined" onClick={closeEditDialog}>
                Отмена
              </Button>
              {hasEntityId && !isDirty ? (
                <Alert severity="info" sx={{ flex: '1 1 240px', py: 0.5 }}>
                  Нет изменений для сохранения
                </Alert>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={saveEntity}
                  disabled={!scheduleSaveAllowed(editData as Record<string, unknown>)}
                >
                  Сохранить
                </Button>
              )}
            </>
          ) : dialogListRole === 'admins' && dialogReadOnly ? (
            <Button onClick={closeEditDialog}>Закрыть</Button>
          ) : (
            <>
              <Button onClick={closeEditDialog}>Отмена</Button>
              {isDirty && (
                <Button variant="contained" color="secondary" onClick={saveEntity}>
                  Сохранить
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(moveDlg)}
        onClose={() => setMoveDlg(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { overflow: 'visible' } } }}
      >
        <DialogTitle>Перенос вхождения</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2, overflow: 'visible' }}>
          <TextField
            label="Новая дата"
            type="date"
            variant="outlined"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={moveDlg?.newDate || ''}
            onChange={(e) => setMoveDlg((m) => (m ? { ...m, newDate: e.target.value } : m))}
          />
          <TextField
            label="Новое время"
            type="time"
            variant="outlined"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={moveDlg?.newTime || ''}
            onChange={(e) => setMoveDlg((m) => (m ? { ...m, newTime: e.target.value } : m))}
            inputProps={{ step: 300 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDlg(null)}>Отмена</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={async () => {
              if (!moveDlg) return
              const iso = datetimeLocalToIso(`${moveDlg.newDate}T${moveDlg.newTime}`)
              await pushScheduleOverride(moveDlg.classId, {
                date: moveDlg.nominal,
                action: 'move',
                new_date: iso,
                new_time: moveDlg.newTime,
              })
              setMoveDlg(null)
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Удалить «{deleteTarget?.label}»?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={doDelete}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
