import { ArrowRight, BedDouble, BrainCircuit, Target } from 'lucide-react'
import type { EChartsOption } from 'echarts'
import type { DashboardResponse } from '../types/api'
import { chartColors, EChart, NAState } from '../components/Chart'
import { MetricRing } from '../components/MetricRing'
import { Panel, SectionHeading } from '../components/Panel'
import { RecoveryOrb } from '../components/RecoveryOrb'
import { formatDate, formatMetric, hasNumber } from '../utils/format'

export function TodaySection({ data }: { data: DashboardResponse }) {
  const { summary, daily, coach } = data
  const recent = daily.slice(-14)
  const trendOption: EChartsOption = {
    legend: {
      data: ['Готовность', 'Нагрузка', 'Сон'],
      top: 0,
      right: 0,
      textStyle: { color: chartColors.text },
      icon: 'roundRect',
    },
    xAxis: {
      type: 'category',
      data: recent.map((point) => formatDate(point.date)),
      boundaryGap: false,
    },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [
      {
        name: 'Готовность',
        type: 'line',
        data: recent.map((point) => point.readiness),
        symbol: 'circle',
        symbolSize: 5,
        smooth: 0.32,
        lineStyle: { color: chartColors.readiness, width: 2 },
        itemStyle: { color: chartColors.readiness },
      },
      {
        name: 'Нагрузка',
        type: 'line',
        data: recent.map((point) => point.load),
        symbol: 'none',
        smooth: 0.32,
        lineStyle: { color: chartColors.load, width: 1.5 },
      },
      {
        name: 'Сон',
        type: 'line',
        data: recent.map((point) => point.sleep_score),
        symbol: 'none',
        smooth: 0.32,
        lineStyle: { color: chartColors.sleep, width: 1.5 },
      },
    ],
  }

  return (
    <section id="today" className="dashboard-section" aria-labelledby="today-title">
      <SectionHeading
        kicker="Ваш день"
        title="Сегодня"
        description="Сводка сигналов восстановления и понятный ориентир на день."
      />
      <span id="today-title" className="sr-only">Сегодня</span>

      <div className="grid grid--today">
        <Panel className="panel--hero readiness-card" aria-label="Готовность сегодня">
          <div className="readiness-card__copy">
            <p className="eyebrow">Главный сигнал</p>
            <h3>Ресурс организма</h3>
            <p>
              {summary.readiness.reason ??
                'Индекс объединяет сон, HRV, пульс покоя и недавнюю нагрузку.'}
            </p>
          </div>
          <RecoveryOrb metric={summary.readiness} />
        </Panel>

        <Panel title="Ключевые метрики" className="panel--metrics">
          <div className="metric-rings">
            <MetricRing
              label="Нагрузка"
              value={summary.load.value}
              max={21}
              unit={summary.load.unit}
              delta={summary.load.delta}
              color={chartColors.load}
            />
            <MetricRing
              label="Сон"
              value={summary.sleep_score.value}
              unit={summary.sleep_score.unit}
              delta={summary.sleep_score.delta}
              color={chartColors.sleep}
            />
            <MetricRing
              label="БиоВозраст"
              value={summary.bio_age.value}
              max={90}
              unit={summary.bio_age.unit}
              delta={summary.bio_age.delta}
              color={chartColors.health}
            />
          </div>
        </Panel>

        <Panel
          eyebrow="Daily Coach"
          title={coach.title ?? 'Спокойный набор объёма'}
          className="coach-card"
          action={<BrainCircuit size={22} aria-hidden="true" />}
        >
          <p>{coach.message ?? 'Ориентируйтесь на самочувствие и не забывайте о восстановлении.'}</p>
          <div className="coach-target">
            <Target size={19} aria-hidden="true" />
            <span>Целевая нагрузка</span>
            <strong>
              {hasNumber(coach.target_min) && hasNumber(coach.target_max)
                ? `${formatMetric(coach.target_min)}–${formatMetric(coach.target_max)}`
                : 'Н/Д'}
            </strong>
          </div>
          <a href="#load" className="text-link">
            Разобрать нагрузку <ArrowRight size={15} aria-hidden="true" />
          </a>
        </Panel>

        <Panel
          eyebrow="Баланс сна"
          title="Долг сна"
          className="sleep-debt-card"
          action={<BedDouble size={22} aria-hidden="true" />}
          hint="Накопленная разница между вашей потребностью во сне и фактической длительностью."
        >
          <div className="big-stat big-stat--violet">
            <strong>{formatMetric(summary.sleep_debt.value, 1)}</strong>
            <span>{summary.sleep_debt.unit ?? 'ч'}</span>
          </div>
          <p>{summary.sleep_debt.reason ?? 'Умеренный долг можно компенсировать постепенно за несколько ночей.'}</p>
        </Panel>

        <Panel title="Динамика последних дней" className="panel--trend">
          {recent.some((point) => hasNumber(point.readiness) || hasNumber(point.load)) ? (
            <EChart option={trendOption} height={250} ariaLabel="Тренды готовности, нагрузки и сна" />
          ) : (
            <NAState />
          )}
        </Panel>
      </div>
    </section>
  )
}
