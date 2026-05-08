/** Значение для input type="datetime-local" в локальном времени браузера. */
export function toDatetimeLocalValue(d: Date | string | null | undefined): string {
  if (d == null || d === '') return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Из поля datetime-local в ISO для API. */
export function datetimeLocalToIso(s: string): string | null {
  if (!s || !String(s).trim()) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

type AdminTab = 'events' | 'news' | 'schedule' | string

/** Перед POST/PUT в админке: даты в ISO. */
export function normalizeAdminPayloadDates(activeTab: AdminTab, payload: Record<string, unknown>): void {
  if (activeTab === 'events' || activeTab === 'news') {
    if ('date' in payload && typeof payload.date === 'string' && payload.date.trim()) {
      const iso = datetimeLocalToIso(payload.date)
      if (iso) payload.date = iso
    }
    if ('end_date' in payload) {
      if (payload.end_date === '' || payload.end_date == null) {
        payload.end_date = null
      } else if (typeof payload.end_date === 'string' && payload.end_date.trim()) {
        const iso = datetimeLocalToIso(payload.end_date)
        if (iso) payload.end_date = iso
      }
    }
  }
  if (activeTab === 'schedule' && 'start_datetime' in payload) {
    if (payload.start_datetime === '' || payload.start_datetime == null) {
      payload.start_datetime = null
    } else if (typeof payload.start_datetime === 'string' && payload.start_datetime) {
      const iso = datetimeLocalToIso(payload.start_datetime)
      if (iso) payload.start_datetime = iso
    }
  }
  if (activeTab === 'tariffs' && 'discount_until' in payload) {
    if (payload.discount_until === '' || payload.discount_until == null) {
      payload.discount_until = null
    } else if (typeof payload.discount_until === 'string' && payload.discount_until.trim()) {
      const iso = datetimeLocalToIso(payload.discount_until)
      if (iso) payload.discount_until = iso
    }
  }
}
