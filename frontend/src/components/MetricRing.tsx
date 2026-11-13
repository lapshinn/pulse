import { useId } from 'react'
import type { Maybe } from '../types/api'
import { clamp, formatMetric, hasNumber } from '../utils/format'

interface MetricRingProps {
  value: Maybe<number>
  max?: number
  label: string
  unit?: Maybe<string>
  color?: string
  size?: 'small' | 'medium' | 'large'
  delta?: Maybe<number>
}

export function MetricRing({
  value,
  max = 100,
  label,
  unit,
  color = '#47e5cf',
  size = 'medium',
  delta,
}: MetricRingProps) {
  const titleId = useId()
  const available = hasNumber(value)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const progress = available ? clamp(value / max, 0, 1) : 0
  const dash = progress * circumference

  return (
    <figure className={`metric-ring metric-ring--${size}`} aria-labelledby={titleId}>
      <div className="metric-ring__visual">
        <svg viewBox="0 0 112 112" role="img" aria-label={`${label}: ${available ? `${formatMetric(value)} ${unit ?? ''}` : 'нет данных'}`}>
          <circle className="metric-ring__track" cx="56" cy="56" r={radius} />
          <circle
            className="metric-ring__progress"
            cx="56"
            cy="56"
            r={radius}
            pathLength={circumference}
            stroke={available ? color : '#435267'}
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="metric-ring__value">
          <strong>{available ? formatMetric(value) : 'Н/Д'}</strong>
          {available && unit && <span>{unit}</span>}
        </div>
      </div>
      <figcaption id={titleId}>
        <span>{label}</span>
        {hasNumber(delta) && (
          <small className={delta >= 0 ? 'delta delta--up' : 'delta delta--down'}>
            {delta > 0 ? '+' : ''}
            {formatMetric(delta, 1)}
          </small>
        )}
      </figcaption>
    </figure>
  )
}
