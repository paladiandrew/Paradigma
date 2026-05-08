import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getApiErrorMessage } from '../services/api'
import api from '../services/api'
import PhoneTextField from '../components/PhoneTextField'
import { displayRuPhoneFromStored, ruPhoneToApi } from '../utils/ruPhoneFormat'
import { TrainerCabinet } from './TrainerPanelPage'

type SubOverview = {
  subscription_id: string
  tariff_id: string
  tariff?: { id: string; name: string; price: number } | null
  end_date?: string | null
  remaining_trainings?: number | null
  nearest_session?: {
    starts_at: string
    class_id: string
    title: string
    duration: number
    tariff_name: string
  } | null
}

type SubProfileRow = {
  id: string
  first_name: string
  last_name: string
  phone?: string
  birth_date?: string | null
  active_subscription_id?: string | null
}

function initials(first: string, last: string) {
  return `${(first || '?').slice(0, 1)}${(last || '').slice(0, 1)}`.toUpperCase()
}

function ageFromBirth(iso: string | null | undefined): string | null {
  if (!iso) return null
  const b = new Date(iso)
  if (Number.isNaN(b.getTime())) return null
  const diff = Date.now() - b.getTime()
  const y = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  return `${y} лет`
}

export default function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [passwordDialog, setPasswordDialog] = useState(false)
  const [subs, setSubs] = useState<SubOverview[]>([])
  const [subProfiles, setSubProfiles] = useState<SubProfileRow[]>([])
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: displayRuPhoneFromStored(user?.phone),
    email: user?.email || '',
  })
  const [password, setPassword] = useState({ old: '', next: '', confirm: '' })
  const [spDialog, setSpDialog] = useState(false)
  const [spForm, setSpForm] = useState({ first_name: '', last_name: '', phone: '', birth_date: '' })
  const [editSp, setEditSp] = useState<SubProfileRow | null>(null)
  const [deleteSp, setDeleteSp] = useState<SubProfileRow | null>(null)

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: displayRuPhoneFromStored(user.phone),
        email: user.email || '',
      })
    }
  }, [user])

  const loadSubs = () => {
    if (user?.role === 'admin' || user?.role === 'trainer') return
    api
      .get('/users/me/subscriptions')
      .then((res) => setSubs(res.data || []))
      .catch(() => setSubs([]))
  }

  const loadSubProfiles = () => {
    if (user?.role === 'admin' || user?.role === 'trainer') return
    api
      .get('/users/me/sub-profiles')
      .then((res) => setSubProfiles(res.data || []))
      .catch(() => setSubProfiles([]))
  }

  useEffect(() => {
    loadSubs()
    loadSubProfiles()
  }, [user?.role])

  const subById = useMemo(() => {
    const m: Record<string, SubOverview> = {}
    for (const s of subs) m[s.subscription_id] = s
    return m
  }, [subs])

  const profileBaseline = useMemo(
    () => ({
      username: (user?.username || '').trim().toLowerCase(),
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: displayRuPhoneFromStored(user?.phone),
      email: user?.email || '',
    }),
    [user?.username, user?.first_name, user?.last_name, user?.phone, user?.email],
  )

  const profileDirty = useMemo(() => {
    return (
      profileData.username.trim().toLowerCase() !== profileBaseline.username ||
      profileData.first_name !== profileBaseline.first_name ||
      profileData.last_name !== profileBaseline.last_name ||
      profileData.phone !== profileBaseline.phone ||
      (profileData.email || '') !== profileBaseline.email
    )
  }, [profileData, profileBaseline])

  const editSpBaselineBirth = editSp?.birth_date ? editSp.birth_date.slice(0, 10) : ''
  const editSpDirty = Boolean(
    editSp &&
      (spForm.first_name !== editSp.first_name ||
        spForm.last_name !== editSp.last_name ||
        (spForm.phone || '') !== (editSp.phone || '') ||
        spForm.birth_date !== editSpBaselineBirth),
  )

  if (!user) return null

  if (user.role === 'trainer') {
    return (
      <Container sx={{ py: { xs: 3, md: 6 }, maxWidth: 1200 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 3, textAlign: 'center', width: '100%' }}>
          Личный профиль тренера
        </Typography>
        <TrainerCabinet embedded />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => void logout().then(() => navigate('/'))}
          >
            Выйти из профиля
          </Button>
        </Box>
      </Container>
    )
  }

  const handleSave = async () => {
    try {
      const u = profileData.username.trim().toLowerCase()
      const phoneApi = ruPhoneToApi(profileData.phone)
      await updateProfile({
        ...profileData,
        username: u || undefined,
        phone: phoneApi.length >= 10 ? phoneApi : '',
      })
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Ошибка обновления'))
    }
  }

  const handlePassword = async () => {
    if (password.next !== password.confirm) {
      setError('Пароли не совпадают')
      return
    }
    await changePassword(password.old, password.next)
    setPasswordDialog(false)
  }

  const createSubProfile = async () => {
    await api.post('/users/me/sub-profiles', {
      first_name: spForm.first_name,
      last_name: spForm.last_name,
      phone: spForm.phone || undefined,
      birth_date: spForm.birth_date ? new Date(spForm.birth_date).toISOString() : undefined,
    })
    setSpDialog(false)
    setSpForm({ first_name: '', last_name: '', phone: '', birth_date: '' })
    loadSubProfiles()
  }

  const saveEditSp = async () => {
    if (!editSp) return
    await api.put(`/users/me/sub-profiles/${editSp.id}`, {
      first_name: spForm.first_name,
      last_name: spForm.last_name,
      phone: spForm.phone || undefined,
      birth_date: spForm.birth_date ? new Date(spForm.birth_date).toISOString() : undefined,
    })
    setEditSp(null)
    loadSubProfiles()
  }

  const doDeleteSp = async () => {
    if (!deleteSp) return
    await api.delete(`/users/me/sub-profiles/${deleteSp.id}`)
    setDeleteSp(null)
    loadSubProfiles()
  }

  const profileColumn = (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: 'secondary.main', fontSize: 28 }}>
            {initials(profileData.first_name, profileData.last_name)}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {[profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || 'Профиль'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{profileData.username || '—'}
            </Typography>
          </Box>
        </Box>
        <Divider />
        <TextField
          label="Логин"
          variant="outlined"
          fullWidth
          value={profileData.username}
          onChange={(e) => setProfileData((v) => ({ ...v, username: e.target.value }))}
          helperText="Латиница, цифры, . _ -"
        />
        <TextField
          label="Имя"
          variant="outlined"
          fullWidth
          value={profileData.first_name}
          onChange={(e) => setProfileData((v) => ({ ...v, first_name: e.target.value }))}
        />
        <TextField
          label="Фамилия"
          variant="outlined"
          fullWidth
          value={profileData.last_name}
          onChange={(e) => setProfileData((v) => ({ ...v, last_name: e.target.value }))}
        />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <PhoneTextField
            fullWidth
            label="Телефон"
            value={profileData.phone}
            onValueChange={(phone) => setProfileData((v) => ({ ...v, phone }))}
            helperText="+7 и маска"
          />
          <Chip label={user.is_phone_verified ? 'Тел. ✓' : 'Тел.'} color={user.is_phone_verified ? 'success' : 'default'} sx={{ mt: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            value={profileData.email || ''}
            onChange={(e) => setProfileData((v) => ({ ...v, email: e.target.value }))}
          />
          <Chip label={user.is_email_verified ? 'Email ✓' : 'Email'} color={user.is_email_verified ? 'success' : 'default'} sx={{ mt: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" color="secondary" onClick={handleSave} disabled={!profileDirty}>
            Сохранить
          </Button>
          <Button variant="outlined" onClick={() => setPasswordDialog(true)}>
            Сменить пароль
          </Button>
        </Box>
      </CardContent>
    </Card>
  )

  const subsColumn =
    user.role === 'admin' ? null : (
      <Box>
        <Card sx={{ borderRadius: 3, mb: 2, boxShadow: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Мои абонементы
            </Typography>
            <Button fullWidth variant="contained" color="secondary" onClick={() => navigate('/tariffs')}>
              Продлить / выбрать
            </Button>
          </CardContent>
        </Card>
        {subs.map((s) => {
          const capTrainings = 8
          const prog =
            s.remaining_trainings != null
              ? Math.min(100, Math.max(0, (Number(s.remaining_trainings) / capTrainings) * 100))
              : 0
          return (
            <Card key={s.subscription_id} sx={{ borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>
                  {s.tariff?.name || 'Тариф'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  До {s.end_date ? new Date(s.end_date).toLocaleDateString('ru-RU') : '—'}
                </Typography>
                {s.remaining_trainings != null && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption">Осталось занятий: {s.remaining_trainings}</Typography>
                    <LinearProgress variant="determinate" value={prog} sx={{ mt: 0.5, height: 8, borderRadius: 1 }} color="secondary" />
                  </Box>
                )}
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Ближайшее занятие
                  </Typography>
                  {s.nearest_session ? (
                    <>
                      <Typography variant="body2" fontWeight={600}>
                        {s.nearest_session.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(s.nearest_session.starts_at).toLocaleString('ru-RU')} · {s.nearest_session.duration} мин
                      </Typography>
                      <Button component={RouterLink} to="/schedule" size="small" sx={{ mt: 1 }} color="secondary">
                        Расписание
                      </Button>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Нет занятий на ближайшую неделю.
                    </Typography>
                  )}
                </Box>
                <Button component={RouterLink} to={`/tariffs?focus=${s.tariff_id}`} size="small" sx={{ mt: 1 }}>
                  Страница тарифа
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    )

  const childrenSection =
    user.role === 'admin' ? null : (
      <Box sx={{ mt: { xs: 3, md: 0 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Связанные профили
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={() => {
              setSpForm({ first_name: '', last_name: '', phone: '', birth_date: '' })
              setSpDialog(true)
            }}
          >
            + Добавить
          </Button>
        </Box>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {subProfiles.map((sp) => {
            const linked = sp.active_subscription_id ? subById[sp.active_subscription_id] : null
            return (
              <Card key={sp.id} sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Avatar sx={{ bgcolor: 'grey.700' }}>{initials(sp.first_name, sp.last_name)}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700}>
                      {sp.first_name} {sp.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {ageFromBirth(sp.birth_date || undefined) || 'возраст не указан'}
                      {sp.phone ? ` · ${sp.phone}` : ''}
                    </Typography>
                    {linked ? (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Абонемент: <strong>{linked.tariff?.name}</strong>
                        <br />
                        до {linked.end_date ? new Date(linked.end_date).toLocaleDateString('ru-RU') : '—'} · осталось:{' '}
                        {linked.remaining_trainings ?? '—'}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Абонемент не привязан
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {!linked ? (
                        <Button size="small" variant="outlined" color="secondary" component={RouterLink} to="/tariffs">
                          Купить абонемент
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          component={RouterLink}
                          to={`/tariffs?focus=${encodeURIComponent(linked.tariff_id)}`}
                        >
                          Продлить / тариф
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditSp(sp)
                          setSpForm({
                            first_name: sp.first_name,
                            last_name: sp.last_name,
                            phone: sp.phone || '',
                            birth_date: sp.birth_date ? sp.birth_date.slice(0, 10) : '',
                          })
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteSp(sp)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </Box>
    )

  return (
    <Container sx={{ py: { xs: 3, md: 6 }, maxWidth: 1200 }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
        Профиль
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12} md={user.role === 'admin' ? 12 : 5}>
          {profileColumn}
        </Grid>
        {user.role !== 'admin' && (
          <Grid item xs={12} md={7}>
            {subsColumn}
            <Divider sx={{ my: 3 }} />
            {childrenSection}
          </Grid>
        )}
      </Grid>

      {user.role !== 'admin' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => void logout().then(() => navigate('/'))}
          >
            Выйти из профиля
          </Button>
        </Box>
      )}

      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>Смена пароля</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Текущий" type="password" value={password.old} onChange={(e) => setPassword((v) => ({ ...v, old: e.target.value }))} />
          <TextField label="Новый" type="password" value={password.next} onChange={(e) => setPassword((v) => ({ ...v, next: e.target.value }))} />
          <TextField label="Подтверждение" type="password" value={password.confirm} onChange={(e) => setPassword((v) => ({ ...v, confirm: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Отмена</Button>
          <Button variant="contained" color="secondary" onClick={handlePassword}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={spDialog} onClose={() => setSpDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новый подпрофиль</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Имя *" value={spForm.first_name} onChange={(e) => setSpForm((f) => ({ ...f, first_name: e.target.value }))} />
          <TextField label="Фамилия *" value={spForm.last_name} onChange={(e) => setSpForm((f) => ({ ...f, last_name: e.target.value }))} />
          <TextField label="Телефон" value={spForm.phone} onChange={(e) => setSpForm((f) => ({ ...f, phone: e.target.value }))} />
          <TextField
            label="Дата рождения"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={spForm.birth_date}
            onChange={(e) => setSpForm((f) => ({ ...f, birth_date: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSpDialog(false)}>Отмена</Button>
          <Button variant="contained" color="secondary" onClick={createSubProfile}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editSp)} onClose={() => setEditSp(null)} fullWidth maxWidth="sm">
        <DialogTitle>Редактирование</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Имя" value={spForm.first_name} onChange={(e) => setSpForm((f) => ({ ...f, first_name: e.target.value }))} />
          <TextField label="Фамилия" value={spForm.last_name} onChange={(e) => setSpForm((f) => ({ ...f, last_name: e.target.value }))} />
          <TextField label="Телефон" value={spForm.phone} onChange={(e) => setSpForm((f) => ({ ...f, phone: e.target.value }))} />
          <TextField
            label="Дата рождения"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={spForm.birth_date}
            onChange={(e) => setSpForm((f) => ({ ...f, birth_date: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSp(null)}>Отмена</Button>
          <Button variant="contained" color="secondary" onClick={saveEditSp} disabled={!editSpDirty}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteSp)} onClose={() => setDeleteSp(null)}>
        <DialogTitle>Удалить подпрофиль?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteSp(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={doDeleteSp}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  )
}
