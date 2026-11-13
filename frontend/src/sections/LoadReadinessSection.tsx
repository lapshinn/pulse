import type { EChartsOption } from 'echarts'
import type { DashboardResponse } from '../types/api'
import { chartColors, EChart, NAState } from '../components/Chart'
import { Panel, SectionHeading } from '../components/Panel'
import { formatDate, hasNumber } from '../utils/format'

export function LoadReadinessSection({ data }: { data: DashboardResponse }) {
  const daily = data.daily
  const labels = daily.map((point) => formatDate(point.date))
  const overviewOption: EChartsOption = {
    axisPointer: { link: [{ xAxisIndex: [0, 1] }] },
    tooltip: { trigger: 'axis' },
    grid: [
      { left: 12, right: 18, top: 28, height: '30%', containLabel: true },
      { left: 12, right: 18, top: '55%', height: '30%', containLabel: true },
    ],
    xAxis: [
      {
        type: 'category',
        data: labels,
        gridIndex: 0,
        axisLabel: { show: false },
        axisPointer: { label: { show: false } },
      },
      {
        type: 'category',
        data: labels,
        gridIndex: 1,
        axisLabel: { interval: Math.max(0, Math.floor(daily.length / 7) - 1) },
      },
    ],
    yAxis: [
      {
        type: 'value',
        gridIndex: 0,
        name: 'Нагрузка',
        min: 0,
        max: 21,
        nameTextStyle: { color: chartColors.load },
      },
      {
        type: 'value',
        gridIndex: 1,
        name: 'Готовность',
        min: 0,
        max: 100,
        nameTextStyle: { color: chartColors.readiness },
      },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: Math.max(0, 100 - (30 / Math.max(1, daily.length)) * 100), end: 100 },
      {
        type: 'slider',
        xAxisIndex: [0, 1],
        bottom: 0,
        height: 15,
        borderColor: 'transparent',
        backgroundColor: 'rgba(255,255,255,.04)',
        fillerColor: 'rgba(71,229,207,.12)',
        handleStyle: { color: chartColors.readiness },
        textStyle: { color: chartColors.text },
      },
    ],
    series: [
      {
        name: 'Нагрузка',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: daily.map((point) => point.load),
        barMaxWidth: 18,
        itemStyle: { color: chartColors.load, borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Готовность',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: daily.map((point) => point.readiness),
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: chartColors.readiness, width: 2 },
        areaStyle: { color: 'rgba(71,229,207,.18)' },
      },
    ],
  }

  const zones = data.selected.zones ?? []
  const zoneOption: EChartsOption = {
    grid: { left: 0, right: 24, top: 8, bottom: 0, containLabel: true },
    xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
    yAxis: {
      type: 'category',
      data: zones.map((zone) => zone.zone),
      axisLabel: { color: chartColors.text },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const point = params as { dataIndex: number }
        const zone = zones[point.dataIndex]
        return `${zone.zone}<br/>${zone.minutes ?? 'Н/Д'} мин · вклад ${zone.contribution ?? 'Н/Д'}`
      },
    },
    series: [
      {
        type: 'bar',
        data: zones.map((zone, index) => ({
          value: zone.contribution,
          itemStyle: {
            color: ['#5da9ff', '#47e5cf', '#f3b658', '#ff9d68', '#ff7d72'][index % 5],
            borderRadius: 4,
          },
        })),
        label: {
          show: true,
          position: 'right',
          color: '#cbd9e9',
          formatter: (params: unknown) => {
            const point = params as { dataIndex: number; value: number }
            const minutes = zones[point.dataIndex]?.minutes
            return `${point.value ?? '—'} · ${minutes ?? '—'} мин`
          },
        },
      },
    ],
  }

  const scatter = daily.slice(0, -1).flatMap((point, index) => {
    const next = daily[index + 1]
    return hasNumber(point.load) && hasNumber(next.readiness) ? [[point.load, next.readiness, point.date]] : []
  })
  const scatterOption: EChartsOption = {
    grid: { left: 10, right: 14, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'value', name: 'Нагрузка', min: 0, max: 21 },
    yAxis: { type: 'value', name: 'Готовность +1', min: 0, max: 100 },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const point = params as { value: [number, number, string] }
        return `${formatDate(point.value[2])}<br/>Нагрузка ${point.value[0]} → готовность ${point.value[1]}`
      },
    },
    series: [
      {
        type: 'scatter',
        data: scatter,
        symbolSize: 10,
        itemStyle: { color: chartColors.readiness, opacity: 0.75 },
      },
    ],
  }

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
  const heatmap = daily.flatMap((point) => {
    const hour = hasNumber(point.load) ? (point.load >= 8 ? 18 : point.load >= 3 ? 17 : 9) : null
    const date = new Date(`${point.date}T12:00:00`)
    const day = (date.getDay() + 6) % 7
    return hour !== null && hasNumber(point.load) ? [[hour, day, point.load]] : []
  })
  const heatmapOption: EChartsOption = {
    grid: { left: 12, right: 16, top: 10, bottom: 35, containLabel: true },
    xAxis: { type: 'category', data: hours, axisLabel: { interval: 3 } },
    yAxis: { type: 'category', data: days },
    visualMap: {
      min: 0,
      max: 21,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#152336', '#265875', chartColors.load] },
      textStyle: { color: chartColors.text },
      show: false,
    },
    tooltip: {
      formatter: (params: unknown) => {
        const point = params as { value: [number, number, number] }
        return `${days[point.value[1]]}, ${hours[point.value[0]]}<br/>Нагрузка ${point.value[2]}`
      },
    },
    series: [{ type: 'heatmap', data: heatmap, itemStyle: { borderColor: '#0a1522', borderWidth: 2, borderRadius: 3 } }],
  }

  return (
    <section id="load" className="dashboard-section" aria-labelledby="load-title">
      <SectionHeading
        kicker="Доза и ответ"
        title="Нагрузка и готовность"
        description="Смотрите нагрузку и восстановление в одной временной шкале — без искажающей двойной оси."
      />
      <span id="load-title" className="sr-only">Нагрузка и готовность</span>
      <div className="grid">
        <Panel
          title="Нагрузка ↔ готовность"
          className="panel--wide"
          hint="Графики синхронизированы: масштабирование и курсор применяются к обеим шкалам."
        >
          {daily.length ? <EChart option={overviewOption} height={430} ariaLabel="Синхронизированные графики нагрузки и готовности" /> : <NAState />}
        </Panel>
        <Panel title="Вклад пульсовых зон" className="panel--half">
          {zones.length ? <EChart option={zoneOption} height={260} ariaLabel="Вклад пульсовых зон в нагрузку" /> : <NAState />}
        </Panel>
        <Panel
          title="Ответ на следующий день"
          className="panel--half"
          hint="Каждая точка связывает нагрузку одного дня с готовностью следующего."
        >
          {scatter.length ? <EChart option={scatterOption} height={260} ariaLabel="Связь нагрузки и готовности следующего дня" /> : <NAState />}
        </Panel>
        <Panel
          title="Ритм недели и времени"
          className="panel--wide"
          hint="Для демо время активности синтезировано; после подключения Mi Fitness здесь появятся реальные часы тренировок."
        >
          {heatmap.length ? <EChart option={heatmapOption} height={260} ariaLabel="Тепловая карта нагрузки по дням и часам" /> : <NAState />}
        </Panel>
      </div>
    </section>
  )
}
