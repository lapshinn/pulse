import type { Maybe } from '../types/api'

export function hasNumber(value: Maybe<number>): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function formatMetric(value: Maybe<number>, digits = 0) {
  if (!hasNumber(value)) return 'Н/Д'
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', options ?? { day: 'numeric', month: 'short' }).format(date)
}

export function formatLongDate(value: string) {
  return formatDate(value, { weekday: 'short', day: 'numeric', month: 'long' })
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function metricColor(value: Maybe<number>, inverse = false) {
  if (!hasNumber(value)) return '#5f7189'
  const good = inverse ? value <= 35 : value >= 70
  const warning = inverse ? value >= 65 : value <= 40
  return good ? '#47e5cf' : warning ? '#ff7d72' : '#f3b658'
}
