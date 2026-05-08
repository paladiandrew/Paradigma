/** Понедельник недели для даты `d` (локальное время). */
export function mondayOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function weekStartISO(d: Date): string {
  const m = mondayOfWeek(d)
  const y = m.getFullYear()
  const mo = String(m.getMonth() + 1).padStart(2, '0')
  const da = String(m.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export function bookingInstanceKey(classId: string, startsAt: string): string {
  return `${classId}|${startsAt}`
}
