const MINUTE = 60000
export const DAY = 24 * 60 * MINUTE

export const uid = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const money = (value) => Math.round(Number(value) || 0).toLocaleString('th-TH')
export const baht = (value) => `${money(value)} บาท`

const pad = (value) => String(value).padStart(2, '0')

export const timeHM = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const dateShort = (value) =>
  new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

export const dateLong = (value) =>
  new Date(value).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const dateWithDay = (value) =>
  new Date(value).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })

export const minutesText = (minutes) => {
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (!hours) return `${rest} นาที`
  if (!rest) return `${hours} ชม.`
  return `${hours} ชม. ${rest} นาที`
}

export const addMinutes = (value, minutes) => new Date(new Date(value).getTime() + minutes * MINUTE)

export const startOfDay = (value = new Date()) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

export const minutesBetween = (from, to) => Math.round((new Date(to).getTime() - new Date(from).getTime()) / MINUTE)

/** Combine a day (Date) with "HH:MM" into a Date. */
export const atTime = (day, hm) => {
  const [hours, minutes] = hm.split(':').map(Number)
  const date = startOfDay(day)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '')

export const phoneText = (value) => {
  const digits = digitsOnly(value)
  if (digits.length !== 10) return digits
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
