/** Маска ввода: +7 (999) 123-45-67, в API уходит нормализованная строка цифр. */

export function formatRuPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  else if (digits.startsWith('9')) digits = '7' + digits
  else if (!digits.startsWith('7')) digits = '7' + digits.replace(/^0+/, '')
  digits = digits.slice(0, 11)
  const n = digits.slice(1)
  if (n.length === 0) return '+7'
  let out = '+7 ('
  out += n.slice(0, 3)
  if (n.length <= 3) return n.length === 3 ? `${out})` : out
  out += ') '
  out += n.slice(3, 6)
  if (n.length <= 6) return out
  out += '-'
  out += n.slice(6, 8)
  if (n.length <= 8) return out
  out += '-'
  out += n.slice(8, 10)
  return out
}

/** Цифры для бэкенда (как правило 11 символов, начинается с 7). */
export function ruPhoneToApi(formatted: string): string {
  let d = formatted.replace(/\D/g, '')
  if (d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length === 10 && d.startsWith('9')) d = '7' + d
  return d
}

/** Отобразить значение из БД (только цифры или уже с маской). */
export function displayRuPhoneFromStored(stored: string | null | undefined): string {
  if (!stored || !String(stored).trim()) return ''
  return formatRuPhoneInput(String(stored))
}
