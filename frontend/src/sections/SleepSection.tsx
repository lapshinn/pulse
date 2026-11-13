import type { EChartsOption } from 'echarts'
import { Moon, Sunrise } from 'lucide-react'
import type { DashboardResponse } from '../types/api'
import { chartColors, EChart, NAState } from '../components/Chart'
import { Panel, SectionHeading } from '../components/Panel'
import { clamp, formatDate, formatMetric, hasNumber } from '../utils/format'

const stageNames: Record<string, string> = {
  awake: 'Бодрствование',
  wake: 'Бодрствование',
  rem: 'REM',
  light: 'Лёгкий',
  core: 'Лёгкий',
  deep: 'Глубокий',
}
const stageLevel: Record<string, number> = { deep: 0, light: 1, core: 1, rem: 2, awake: 3, wake: 3 }
const stageColor: Record<string, string> = {
  deep: '#5c59c8',
  light: '#776cdf',
  core: '#776cdf',
  rem: chartColors.sleep,
  awake: '#d2c9ff',
  wake: '#d2c9ff',
}

function timeLabel(value: string) {
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return value.match(/\d{1,2}:\d{2}/)?.[0] ?? value
}

export function SleepSection({ data }: { data: DashboardResponse }) {
  const stages = data.selected.sleep_stages ?? []
  const stagePoints = stages.flatMap((stage) => {
    const key = stage.stage.toLowerCase()
    const level = stageLevel[key] ?? 1
    return [
      [timeLabel(stage.start), level],
      [timeLabel(stage.end), level],
    ]
  })
  const hypnogramOption: EChartsOption = {
    grid: { left: 8, right: 12, top: 18, bottom: 12, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, axisLabel: { interval: Math.max(0, Math.floor(stagePoints.length / 6)) } },
    yAxis: {
      type: 'value',
      min: 0,
      max: 3,
      interval: 1,
      axisLabel: {
        formatter: (value: number) => ['Глуб.', 'Лёгк.', 'REM', 'Явь'][value] ?? '',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const point = (params as Array<{ value: [string, number] }>)[0]
        const label = ['Глубокий', 'Лёгкий', 'REM', 'Бодрствование'][point?.value[1]]
        return `${point?.value[0] ?? ''}<br/>${label ?? 'Н/Д'}`
      },
    },
    series: [
      {
        type: 'line',
        data: stagePoints,
        step: 'end',
        showSymbol: false,
        lineStyle: { color: chartColors.sleep, width: 3 },
        areaStyle: { color: 'rgba(169,139,255,.15)' },
      },
    ],
  }

  const durations = stages.reduce<Record<string, number>>((acc, stage) => {
    const key = stage.stage.toLowerCase()
    const normalized = key === 'core' ? 'light' : key === 'wake' ? 'awake' : key
    acc[normalized] = (acc[normalized] ?? 0) + (stage.duration_minutes ?? 0)
    return acc
  }, {})
  const phaseKeys = ['deep', 'light', 'rem', 'awake']
  const phaseOption: EChartsOption = {
    legend: {
      data: phaseKeys.map((key) => stageNames[key]),
      bottom: 0,
      textStyle: { color: chartColors.text },
    },
    grid: { left: 4, right: 10, top: 34, bottom: 50, containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: '{value} мин' } },
    yAxis: { type: 'category', data: ['Ночь'], axisLabel: { show: false } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    series: phaseKeys.map((key) => ({
      name: stageNames[key],
      type: 'bar',
      stack: 'sleep',
      data: [durations[key] ?? 0],
      itemStyle: { color: stageColor[key], borderRadius: 2 },
    })),
  }

  const sleepTrendOption: EChartsOption = {
    xAxis: { type: 'category', data: data.daily.map((point) => formatDate(point.date)), boundaryGap: false },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [
      {
        type: 'line',
        name: 'Оценка сна',
        data: data.daily.map((point) => point.sleep_score),
        smooth: 0.35,
        symbol: 'none',
        lineStyle: { color: chartColors.sleep, width: 2 },
        areaStyle: { color: 'rgba(169,139,255,.13)' },
      },
    ],
  }
  const debtTrendOption: EChartsOption = {
    xAxis: { type: 'category', data: data.daily.map((point) => formatDate(point.date)), boundaryGap: false },
    yAxis: { type: 'value', name: 'ч' },
    series: [
      {
        type: 'line',
        name: 'Долг сна',
        data: data.daily.map((point) => point.sleep_debt),
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: chartColors.warning, width: 1.5 },
        areaStyle: { color: 'rgba(255,125,114,.18)' },
      },
    ],
  }
  const factorLabels: Record<string, string> = {
    duration: 'Длительность',
    efficiency: 'Эффективность',
    composition: 'Состав фаз',
    consistency: 'Регулярность',
    regularity: 'Регулярность',
    deep_sleep: 'Глубокий сон',
    rem_sleep: 'REM-сон',
    timing: 'Время сна',
  }
  const factors = Object.entries(data.selected.sleep_factors ?? {}).filter((entry): entry is [string, number] =>
    hasNumber(entry[1]),
  )
  const selectedDay = data.daily.find((point) => point.date === data.selected.date) ?? data.daily.at(-1)

  return (
    <section id="sleep" className="dashboard-section" aria-labelledby="sleep-title">
      <SectionHeading
        kicker="Архитектура ночи"
        title="Сон"
        description="Фазы выбранной ночи, качество и накопленный баланс восстановления."
      />
      <span id="sleep-title" className="sr-only">Сон</span>
      <div className="sleep-summary">
        <div><Moon size={17} aria-hidden="true" /><span>Отбой</span><strong>{selectedDay?.bedtime ? timeLabel(selectedDay.bedtime) : 'Н/Д'}</strong></div>
        <div><Sunrise size={17} aria-hidden="true" /><span>Подъём</span><strong>{selectedDay?.wake_time ? timeLabel(selectedDay.wake_time) : 'Н/Д'}</strong></div>
        <div><span>Всего сна</span><strong>{formatMetric(selectedDay?.total_sleep_hours, 1)} ч</strong></div>
        <div><span>Эффективность</span><strong>{formatMetric(selectedDay?.efficiency)}%</strong></div>
      </div>
      <div className="grid">
        <Panel title="Гипнограмма выбранной ночи" className="panel--wide">
          {stagePoints.length ? <EChart option={hypnogramOption} height={280} ariaLabel="Гипнограмма выбранной ночи" /> : <NAState />}
        </Panel>
        <Panel title="Баланс фаз" className="panel--half">
          {stages.length ? <EChart option={phaseOption} height={235} ariaLabel="Состав сна по фазам" /> : <NAState />}
        </Panel>
        <Panel title="Факторы баланса" className="panel--half">
          {factors.length ? (
            <div className="factor-list">
              {factors.map(([key, value]) => (
                <div className="factor" key={key}>
                  <div><span>{factorLabels[key] ?? key}</span><strong>{formatMetric(value)}%</strong></div>
                  <div className="factor__track"><span style={{ width: `${clamp(value)}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <NAState />}
        </Panel>
        <Panel title="Оценка сна" className="panel--half">
          {data.daily.some((point) => hasNumber(point.sleep_score)) ? <EChart option={sleepTrendOption} height={250} ariaLabel="Динамика оценки сна" /> : <NAState />}
        </Panel>
        <Panel title="Долг сна" className="panel--half">
          {data.daily.some((point) => hasNumber(point.sleep_debt)) ? <EChart option={debtTrendOption} height={250} ariaLabel="Динамика долга сна" /> : <NAState />}
        </Panel>
      </div>
    </section>
  )
}
