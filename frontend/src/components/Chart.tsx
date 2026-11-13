import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { DatabaseZap } from 'lucide-react'
import type { ReactNode } from 'react'

interface ChartProps {
  option: EChartsOption
  height?: number
  ariaLabel: string
  onEvents?: Record<string, (params: unknown) => void>
}

export const chartColors = {
  readiness: '#47e5cf',
  load: '#f3b658',
  sleep: '#a98bff',
  health: '#5da9ff',
  warning: '#ff7d72',
  muted: '#6d7e94',
  grid: 'rgba(146, 171, 202, 0.12)',
  text: '#91a2b8',
}

export const chartBase: EChartsOption = {
  animationDuration: 500,
  textStyle: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    color: chartColors.text,
  },
  grid: { left: 8, right: 12, top: 26, bottom: 24, containLabel: true },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(7, 17, 29, .96)',
    borderColor: 'rgba(119, 157, 197, .26)',
    textStyle: { color: '#e9f2ff' },
    confine: true,
  },
  xAxis: {
    axisLine: { lineStyle: { color: chartColors.grid } },
    axisTick: { show: false },
    axisLabel: { color: chartColors.text },
  },
  yAxis: {
    splitLine: { lineStyle: { color: chartColors.grid } },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: chartColors.text },
  },
}

export function EChart({ option, height = 260, ariaLabel, onEvents }: ChartProps) {
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ReactECharts
        option={{ ...chartBase, ...option }}
        style={{ height, width: '100%' }}
        notMerge
        lazyUpdate
        onEvents={onEvents}
      />
    </div>
  )
}

export function NAState({
  title = 'Недостаточно данных',
  detail = 'Импортируйте данные или выберите другой период.',
  action,
}: {
  title?: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="na-state" role="status">
      <DatabaseZap aria-hidden="true" />
      <strong>{title}</strong>
      <span>{detail}</span>
      {action}
    </div>
  )
}
