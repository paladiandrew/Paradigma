/** Календарные даты API вида YYYY-MM-DD без зоны — парсим как локальную дату, без сдвига дня из‑за UTC. */
export function parseApiCalendarDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const day = String(iso).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatRuCalendarDate(iso: string | null | undefined, fallback = '—'): string {
  const d = parseApiCalendarDate(iso)
  if (!d) return fallback
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatRuCalendarShort(iso: string | null | undefined, fallback = '—'): string {
  const d = parseApiCalendarDate(iso)
  if (!d) return fallback
  return d.toLocaleDateString('ru-RU')
}

/** Дата из input type=date (YYYY-MM-DD) → ISO без сдвига календарного дня из‑за UTC полуночи. */
export function dateInputToIsoNoon(birth_date: string | undefined): string | undefined {
  const s = birth_date?.trim()
  if (!s) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00`).toISOString()
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** Дата окончания скидки (часто YYYY-MM-DD из API): считаем действительной до конца этого календарного дня, локально. */
export function isDiscountCalendarDateStillValid(until: string | null | undefined): boolean {
  if (!until) return true
  const d = parseApiCalendarDate(until)
  if (!d) return new Date(until).getTime() > Date.now()
  d.setHours(23, 59, 59, 999)
  return d.getTime() > Date.now()
}
