import type { EChartsOption } from 'echarts'
import type { DashboardResponse, DailyPoint, Maybe } from '../types/api'
import { chartColors, EChart, NAState } from '../components/Chart'
import { Panel, SectionHeading } from '../components/Panel'
import { formatDate, formatMetric, hasNumber } from '../utils/format'

type DailyMetric = 'hrv' | 'rhr' | 'spo2' | 'stress_7d' | 'vo2max'

interface HealthMetricDefinition {
  key: DailyMetric
  title: string
  unit: string
  color: string
  description: string
  reference?: [number, number]
}

const metrics: HealthMetricDefinition[] = [
  { key: 'hrv', title: 'HRV', unit: 'мс', color: chartColors.readiness, description: 'Вариабельность ритма' },
  { key: 'rhr', title: 'Пульс покоя', unit: 'уд/мин', color: chartColors.warning, description: 'Ночной минимум' },
  { key: 'spo2', title: 'SpO₂', unit: '%', color: chartColors.health, description: 'Насыщение кислородом', reference: [95, 100] },
  { key: 'stress_7d', title: 'Стресс 7 дней', unit: 'балл', color: chartColors.load, description: 'Сглаженный индекс' },
  { key: 'vo2max', title: 'VO₂ max', unit: 'мл/кг/мин', color: '#6aa8ff', description: 'Кардиореспираторная форма' },
]

function median(values: Maybe<number>[]) {
  const sorted = values.filter(hasNumber).sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function metricOption(daily: DailyPoint[], metric: HealthMetricDefinition): EChartsOption {
  const values = daily.map((point) => point[metric.key])
  const baseline = median(values)
  return {
    legend: {
      data: [metric.title, 'Базовая линия'],
      right: 0,
      top: 0,
      icon: 'roundRect',
      textStyle: { color: chartColors.text, fontSize: 10 },
    },
    grid: { left: 8, right: 12, top: 36, bottom: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: daily.map((point) => formatDate(point.date)),
      boundaryGap: false,
      axisLabel: { show: false },
    },
    yAxis: { type: 'value', scale: true, axisLabel: { formatter: '{value}' } },
    tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${formatMetric(value as number, 1)} ${metric.unit}` },
    series: [
      {
        name: metric.title,
        type: 'line',
        data: values,
        smooth: 0.3,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { color: metric.color, width: 2 },
        areaStyle: { color: `${metric.color}16` },
        markArea: metric.reference
          ? {
              silent: true,
              itemStyle: { color: 'rgba(71,229,207,.07)' },
              data: [[{ yAxis: metric.reference[0], name: 'Референс' }, { yAxis: metric.reference[1] }]],
            }
          : undefined,
      },
      {
        name: 'Базовая линия',
        type: 'line',
        data: daily.map(() => baseline),
        symbol: 'none',
        silent: true,
        lineStyle: { color: chartColors.muted, width: 1, type: 'dashed' },
      },
    ],
  }
}

export function HealthSection({ data }: { data: DashboardResponse }) {
  return (
    <section id="health" className="dashboard-section" aria-labelledby="health-title">
      <SectionHeading
        kicker="Физиологический фон"
        title="Здоровье"
        description="Малые графики сохраняют масштаб каждого сигнала и отделяют вашу базовую линию от референса."
      />
      <span id="health-title" className="sr-only">Здоровье</span>
      <div className="health-grid">
        {metrics.map((metric) => {
          const values = data.daily.map((point) => point[metric.key])
          const latest = [...values].reverse().find(hasNumber)
          const baseline = median(values)
          return (
            <Panel
              key={metric.key}
              title={metric.title}
              eyebrow={metric.description}
              className={`health-card health-card--${metric.key}`}
              action={
                <div className="health-card__value">
                  <strong>{formatMetric(latest, metric.key === 'spo2' ? 1 : 0)}</strong>
                  <span>{metric.unit}</span>
                </div>
              }
            >
              {values.some(hasNumber) ? (
                <>
                  <EChart option={metricOption(data.daily, metric)} height={210} ariaLabel={`Динамика ${metric.title}`} />
                  <p className="baseline-note">
                    <span /> Ваша медиана: {formatMetric(baseline, 1)} {metric.unit}
                    {metric.reference && <em>Референс {metric.reference[0]}–{metric.reference[1]}</em>}
                  </p>
                </>
              ) : <NAState />}
            </Panel>
          )
        })}
      </div>
    </section>
  )
}
