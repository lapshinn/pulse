import { Sparkles } from 'lucide-react'
import type { MetricValue } from '../types/api'
import { formatMetric, hasNumber, metricColor } from '../utils/format'

export function RecoveryOrb({ metric }: { metric: MetricValue }) {
  const available = hasNumber(metric.value)
  const color = metricColor(metric.value)
  const coverage = hasNumber(metric.coverage) ? Math.round(metric.coverage) : null

  return (
    <div
      className="recovery-orb"
      style={{ '--orb-color': color } as React.CSSProperties}
      aria-label={`Готовность: ${available ? formatMetric(metric.value) : 'нет данных'}`}
    >
      <div className="recovery-orb__halo" />
      <div className="recovery-orb__core">
        <Sparkles aria-hidden="true" size={18} />
        <span>Готовность</span>
        <strong>{available ? formatMetric(metric.value) : 'Н/Д'}</strong>
        <small>{available ? metric.status ?? 'сегодня' : metric.reason ?? 'Недостаточно данных'}</small>
      </div>
      {coverage !== null && <span className="recovery-orb__coverage">{coverage}% данных</span>}
    </div>
  )
}
