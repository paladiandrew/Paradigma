import { useCallback, useEffect, useMemo, useState } from 'react'
import { Container } from '@mui/material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import WeekSchedule, { type ScheduleInstance } from '../components/schedule/WeekSchedule'
import ClassDetailModal, { type SubProfileRow, type SubRow } from '../components/schedule/ClassDetailModal'
import { bookingInstanceKey, mondayOfWeek, weekStartISO } from '../utils/scheduleWeek'
import toast from 'react-hot-toast'

type ClassFromApi = {
  id: string
  tariff?: { id: string; name: string; description?: string; price?: number; effective_price?: number } | null
  tariff_id?: string | null
}

type MyBooking = {
  id: string
  training_id: string
  session_starts_at: string | null
  sub_profile_id?: string | null
}

export default function SchedulePage() {
  const { isAuthenticated, user } = useAuth()
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOfWeek(new Date()))
  const [instances, setInstances] = useState<ScheduleInstance[]>([])
  const [classesById, setClassesById] = useState<Record<string, ClassFromApi>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subs, setSubs] = useState<SubRow[]>([])
  const [subProfiles, setSubProfiles] = useState<SubProfileRow[]>([])
  const [bookingsByKey, setBookingsByKey] = useState<Record<string, string>>({})
  const [modalInst, setModalInst] = useState<ScheduleInstance | null>(null)

  const weekIso = useMemo(() => weekStartISO(weekAnchor), [weekAnchor])

  const loadInstances = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [instRes, classRes] = await Promise.all([
        api.get('/schedule/instances', { params: { week_start: weekIso } }),
        api.get('/schedule'),
      ])
      setInstances(instRes.data || [])
      const cmap: Record<string, ClassFromApi> = {}
      for (const c of classRes.data || []) {
        cmap[c.id] = c
      }
      setClassesById(cmap)
    } catch {
      setError('Не удалось загрузить расписание')
      setInstances([])
    } finally {
      setLoading(false)
    }
  }, [weekIso])

  useEffect(() => {
    loadInstances()
  }, [loadInstances])

  useEffect(() => {
    if (!isAuthenticated) {
      setSubs([])
      setSubProfiles([])
      setBookingsByKey({})
      return
    }
    api
      .get('/users/me/subscriptions')
      .then((r) => setSubs(r.data || []))
      .catch(() => setSubs([]))
    api
      .get('/users/me/sub-profiles')
      .then((r) => setSubProfiles(r.data || []))
      .catch(() => setSubProfiles([]))
    api
      .get('/schedule/my-bookings')
      .then((r) => {
        const list: MyBooking[] = r.data || []
        const m: Record<string, string> = {}
        for (const b of list) {
          const key = bookingInstanceKey(b.training_id, b.session_starts_at || '')
          m[key] = b.id
        }
        setBookingsByKey(m)
      })
      .catch(() => setBookingsByKey({}))
  }, [isAuthenticated])

  const bookingKeySet = useMemo(() => new Set(Object.keys(bookingsByKey)), [bookingsByKey])

  const modalClassMeta = modalInst ? classesById[modalInst.class_id] || null : null

  const bookingIdForModal = modalInst
    ? bookingsByKey[bookingInstanceKey(modalInst.class_id, modalInst.starts_at)] || null
    : null

  const handleBook = async (payload: {
    subscriptionId: string
    subProfileId?: string | null
    sessionStartsAt: string
    trainingId: string
  }) => {
    const res = await toast.promise(
      api.post('/schedule/book', {
        trainingId: payload.trainingId,
        subscriptionId: payload.subscriptionId,
        sub_profile_id: payload.subProfileId || undefined,
        sessionStartsAt: payload.sessionStartsAt,
      }),
      { loading: 'Запись…', success: 'Вы записаны', error: 'Не удалось записаться' },
    )
    const id = res.data?.id as string
    const key = bookingInstanceKey(payload.trainingId, payload.sessionStartsAt)
    setBookingsByKey((prev) => ({ ...prev, [key]: id }))
    setModalInst(null)
    await loadInstances()
  }

  const handleCancelBooking = async () => {
    if (!bookingIdForModal) return
    await toast.promise(api.delete(`/schedule/${bookingIdForModal}/cancel`), {
      loading: 'Отмена…',
      success: 'Запись отменена',
      error: 'Ошибка отмены',
    })
    if (modalInst) {
      const key = bookingInstanceKey(modalInst.class_id, modalInst.starts_at)
      setBookingsByKey((prev) => {
        const n = { ...prev }
        delete n[key]
        return n
      })
    }
    await loadInstances()
  }

  return (
    <Container sx={{ py: { xs: 3, md: 6 } }}>
      <WeekSchedule
        weekStart={weekAnchor}
        onWeekStartChange={setWeekAnchor}
        instances={instances}
        loading={loading}
        error={error}
        bookingKeySet={bookingKeySet}
        onInstanceClick={(inst) => {
          const c = classesById[inst.class_id]
          const tariff_id = inst.tariff_id ?? c?.tariff_id ?? c?.tariff?.id ?? null
          setModalInst({ ...inst, tariff_id })
        }}
      />
      <ClassDetailModal
        open={Boolean(modalInst)}
        onClose={() => setModalInst(null)}
        instance={modalInst}
        classMeta={modalClassMeta}
        isAuthenticated={isAuthenticated}
        user={user}
        subs={subs}
        subProfiles={subProfiles}
        bookingId={bookingIdForModal}
        onBook={handleBook}
        onCancel={handleCancelBooking}
      />
    </Container>
  )
}
