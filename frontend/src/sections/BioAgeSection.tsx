import type { EChartsOption } from 'echarts'
import { BadgeCheck, CircleAlert } from 'lucide-react'
import type { DashboardResponse } from '../types/api'
import { chartColors, EChart, NAState } from '../components/Chart'
import { Panel, SectionHeading } from '../components/Panel'
import { formatDate, formatMetric, hasNumber } from '../utils/format'

export function BioAgeSection({ data }: { data: DashboardResponse }) {
  const { bio_age: bioAge } = data
  const available = bioAge.components.filter((component) => component.available && hasNumber(component.impact))
  const unavailable = bioAge.components.filter((component) => !component.available)
  const contributions = [...available].sort((a, b) => Math.abs(b.impact ?? 0) - Math.abs(a.impact ?? 0))
  const chronological = bioAge.chronological
  const delta = hasNumber(bioAge.value) && hasNumber(chronological) ? bioAge.value - chronological : null

  const contributionOption: EChartsOption = {
    grid: { left: 8, right: 60, top: 10, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `${value > 0 ? '+' : ''}${value}` },
      splitLine: { lineStyle: { color: chartColors.grid } },
    },
    yAxis: {
      type: 'category',
      data: contributions.map((component) => component.name),
      axisLabel: { width: 110, overflow: 'truncate' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as { dataIndex: number }
        const component = contributions[item.dataIndex]
        return `${component.name}<br/>Вклад: ${component.impact && component.impact > 0 ? '+' : ''}${component.impact ?? 'Н/Д'} г.<br/>Эквивалент: ${component.age_equivalent ?? 'Н/Д'} г.`
      },
    },
    series: [
      {
        type: 'bar',
        data: contributions.map((component) => ({
          value: component.impact,
          itemStyle: {
            color: (component.impact ?? 0) <= 0 ? chartColors.readiness : chartColors.warning,
            borderRadius: 4,
          },
        })),
        barMaxWidth: 20,
        label: {
          show: true,
          position: 'right',
          color: '#c9d7e8',
          formatter: (params: unknown) => {
            const value = (params as { value: number }).value
            return `${value > 0 ? '+' : ''}${formatMetric(value, 1)} г.`
          },
        },
      },
    ],
  }

  const radarComponents = available.filter((component) => hasNumber(component.age_equivalent)).slice(0, 6)
  const radarMax = Math.max(60, ...radarComponents.map((component) => component.age_equivalent ?? 0), chronological ?? 0)
  const radarOption: EChartsOption = {
    tooltip: {},
    radar: {
      radius: '62%',
      indicator: radarComponents.map((component) => ({ name: component.name, max: radarMax })),
      axisName: { color: chartColors.text, fontSize: 10 },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,.015)', 'rgba(255,255,255,.035)'] } },
      splitLine: { lineStyle: { color: chartColors.grid } },
      axisLine: { lineStyle: { color: chartColors.grid } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            name: 'Эквивалент возраста',
            value: radarComponents.map((component) => component.age_equivalent),
            lineStyle: { color: chartColors.health, width: 2 },
            areaStyle: { color: 'rgba(93,169,255,.18)' },
            itemStyle: { color: chartColors.health },
          },
          {
            name: 'Хронологический',
            value: radarComponents.map(() => chronological),
            lineStyle: { color: chartColors.muted, width: 1, type: 'dashed' },
            symbol: 'none',
          },
        ],
      },
    ],
  }

  const trendOption: EChartsOption = {
    legend: {
      data: ['БиоВозраст', 'Хронологический'],
      top: 0,
      right: 0,
      textStyle: { color: chartColors.text },
    },
    xAxis: { type: 'category', data: data.daily.map((point) => formatDate(point.date)), boundaryGap: false },
    yAxis: { type: 'value', scale: true, name: 'лет' },
    series: [
      {
        name: 'БиоВозраст',
        type: 'line',
        data: data.daily.map((point) => point.bio_age),
        smooth: 0.32,
        showSymbol: false,
        lineStyle: { color: chartColors.health, width: 2 },
        areaStyle: { color: 'rgba(93,169,255,.12)' },
      },
      {
        name: 'Хронологический',
        type: 'line',
        data: data.daily.map(() => chronological),
        symbol: 'none',
        silent: true,
        lineStyle: { color: chartColors.muted, width: 1, type: 'dashed' },
      },
    ],
  }

  return (
    <section id="bioage" className="dashboard-section dashboard-section--last" aria-labelledby="bioage-title">
      <SectionHeading
        kicker="Долгий горизонт"
        title="Биологический возраст"
        description="Оценка меняется медленно: важнее направление тренда и вклад устойчивых факторов."
      />
      <span id="bioage-title" className="sr-only">Биологический возраст</span>
      <div className="grid">
        <Panel className="bio-age-hero" aria-label="Сводка биологического возраста">
          <div>
            <p className="eyebrow">Текущая оценка</p>
            <div className="bio-age-hero__number">
              <strong>{formatMetric(bioAge.value, 1)}</strong>
              <span>лет</span>
            </div>
          </div>
          <div className={`bio-age-delta ${hasNumber(delta) && delta > 0 ? 'bio-age-delta--warning' : ''}`}>
            {hasNumber(delta) && delta <= 0 ? <BadgeCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
            <div>
              <span>Разница с паспортным</span>
              <strong>{hasNumber(delta) ? `${delta > 0 ? '+' : ''}${formatMetric(delta, 1)} года` : 'Н/Д'}</strong>
            </div>
          </div>
          <div className="confidence">
            <span>Уверенность модели</span>
            <strong>{hasNumber(bioAge.confidence) ? `${formatMetric(bioAge.confidence)}%` : 'Н/Д'}</strong>
            <div><span style={{ width: `${bioAge.confidence ?? 0}%` }} /></div>
          </div>
        </Panel>

        <Panel title="Что формирует оценку" className="panel--two-thirds">
          {contributions.length ? <EChart option={contributionOption} height={320} ariaLabel="Вклад факторов в биологический возраст" /> : <NAState />}
          {!!unavailable.length && <p className="missing-note">Без данных: {unavailable.map((item) => item.name).join(', ')}</p>}
        </Panel>
        <Panel title="Профиль факторов" className="panel--third" hint="Радар — компактное дополнение. Для точного сравнения используйте вклад факторов слева.">
          {radarComponents.length >= 3 ? <EChart option={radarOption} height={320} ariaLabel="Радар факторов биологического возраста" /> : <NAState />}
        </Panel>
        <Panel title="Тренд оценки" className="panel--wide">
          {data.daily.some((point) => hasNumber(point.bio_age)) ? <EChart option={trendOption} height={260} ariaLabel="Тренд биологического возраста" /> : <NAState />}
        </Panel>
      </div>
    </section>
  )
}
