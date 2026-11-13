import type {
  ApiErrorBody,
  DashboardResponse,
  DemoScenario,
  ImportInspectionResponse,
  MetricValue,
  Period,
  Profile,
} from '../types/api'

export const API_ORIGIN = 'http://127.0.0.1:8000'
const API_BASE = `${API_ORIGIN}/api/v1`

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RawMetricValue {
  value: number | null
  unit: string
  status: string
  reason: string | null
  source: string
  coverage: number
  baseline: number | null
  delta: number | null
}

interface RawDashboardResponse {
  profile: Omit<Profile, 'name' | 'demo_scenario'>
  range: {
    start_date: string
    end_date: string
    selected_date: string
    period_days: Period
  }
  summary: Record<string, RawMetricValue>
  coach: {
    target_load: RawMetricValue
    recommended_range: string | null
    recommendation: string
  }
  daily: Array<{
    date: string
    metrics: Record<string, RawMetricValue>
    bedtime: string | null
    wake_time: string | null
    total_sleep_hours: number | null
    efficiency: number | null
  }>
  selected_day: {
    date: string
    heart_rate_zones: Array<{
      zone: number
      name: string
      minutes: number
      load_weight: number
    }>
    sleep_stages: Array<{
      stage: string
      start: string
      end: string
      minutes: number
    }>
    sleep_factors: Record<string, number | null>
  }
  bio_age: {
    metric: RawMetricValue
    chronological_age: number
    components: Record<string, {
      age_equivalent: number | null
      applied_weight: number
      status: string
    }>
  }
  quality: {
    overall_coverage: number
    scenario: DemoScenario
    missing_signals: string[]
    warnings: string[]
  }
}

interface RawImportReport {
  accepted: boolean
  parser_available: boolean
  recognized: Array<{
    name: string
    status: string
    category: string | null
    encoding: string | null
    columns: string[]
    error: string | null
  }>
  missing: string[]
  unknown: Array<{
    name: string
    status: string
    category: string | null
    error: string | null
  }>
  errors: Array<{ code: string; file: string | null; message: string }>
}

function apiErrorMessage(body: ApiErrorBody, fallback: string) {
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail)) return body.detail.map((item) => item.msg).filter(Boolean).join('; ') || fallback
  if (body.detail && typeof body.detail === 'object') return body.detail.message ?? body.detail.code ?? fallback
  return body.message ?? fallback
}

const componentNames: Record<string, string> = {
  hrv: 'HRV',
  rhr: 'Пульс покоя',
  vo2max: 'VO₂ max',
  sleep_efficiency: 'Эффективность сна',
  spo2: 'SpO₂',
  stress_7d: 'Стресс',
  activity: 'Активность',
}

function metricReason(reason: string | null) {
  if (!reason) return null
  const baseline = reason.match(/Need (\d+) more prior baseline night/)
  if (baseline) return `Нужно ещё ${baseline[1]} ночей для базовой линии.`
  if (reason.includes('HRV sensor')) return 'Данные HRV недоступны.'
  if (reason.includes('SpO2')) return 'Данные SpO₂ недоступны.'
  if (reason.includes('VO2max')) return 'Данные VO₂ max недоступны.'
  if (reason.includes('Missing night')) return 'Ночь пропущена: прежний долг сна сохранён.'
  if (reason.includes('Reweighted without')) return 'Оценка пересчитана по доступным сигналам.'
  return reason
}

function normalizeMetric(metric: RawMetricValue): MetricValue {
  return {
    ...metric,
    coverage: Math.round(metric.coverage * 100),
    reason: metricReason(metric.reason),
    status: metric.status === 'available'
      ? 'Доступно'
      : metric.status === 'partial'
        ? 'Частично'
        : 'Недоступно',
  }
}

function normalizeDashboard(raw: RawDashboardResponse): DashboardResponse {
  const readiness = raw.summary.readiness
  const rangeText = raw.coach.recommended_range?.split('-').map(Number) ?? []
  const chronological = raw.bio_age.chronological_age
  return {
    profile: {
      ...raw.profile,
      name: 'Локальный профиль',
      demo_scenario: raw.quality.scenario,
    },
    range: {
      period: raw.range.period_days,
      selected_date: raw.range.selected_date,
      from: raw.range.start_date,
      to: raw.range.end_date,
    },
    summary: {
      readiness: normalizeMetric(raw.summary.readiness),
      load: normalizeMetric(raw.summary.load),
      sleep_score: normalizeMetric(raw.summary.sleep_score),
      bio_age: normalizeMetric(raw.summary.bio_age),
      sleep_debt: normalizeMetric(raw.summary.sleep_debt),
    },
    coach: {
      target_min: Number.isFinite(rangeText[0]) ? rangeText[0] : raw.coach.target_load.value,
      target_max: Number.isFinite(rangeText[1]) ? rangeText[1] : raw.coach.target_load.value,
      title: readiness?.value == null
        ? 'Ориентируйтесь на самочувствие'
        : readiness.value >= 67
          ? 'Можно продуктивно тренироваться'
          : readiness.value >= 34
            ? 'Умеренная нагрузка'
            : 'Сфокусируйтесь на восстановлении',
      message: readiness?.value == null
        ? 'Недостаточно данных для персональной рекомендации.'
        : readiness.value >= 67
          ? 'Сигналы восстановления в норме — сегодня подходит целевой диапазон нагрузки.'
          : readiness.value >= 34
            ? 'Держите сессию контролируемой и следите за самочувствием.'
            : 'Выберите отдых, прогулку или лёгкую восстановительную активность.',
    },
    daily: raw.daily.map((point) => ({
      date: point.date,
      load: point.metrics.load?.value,
      readiness: point.metrics.readiness?.value,
      sleep_score: point.metrics.sleep_score?.value,
      sleep_debt: point.metrics.sleep_debt?.value,
      stress_7d: point.metrics.stress_7d?.value,
      hrv: point.metrics.hrv?.value,
      rhr: point.metrics.resting_hr?.value,
      spo2: point.metrics.spo2?.value,
      vo2max: point.metrics.vo2max?.value,
      bio_age: point.metrics.bio_age?.value,
      bedtime: point.bedtime,
      wake_time: point.wake_time,
      total_sleep_hours: point.total_sleep_hours,
      efficiency: point.efficiency,
    })),
    selected: {
      date: raw.selected_day.date,
      zones: raw.selected_day.heart_rate_zones.map((zone) => ({
        zone: `Зона ${zone.zone}`,
        minutes: zone.minutes,
        contribution: Math.round(zone.minutes * zone.load_weight * 10) / 10,
      })),
      sleep_stages: raw.selected_day.sleep_stages.map((stage) => ({
        stage: stage.stage,
        start: stage.start,
        end: stage.end,
        duration_minutes: stage.minutes,
      })),
      sleep_factors: raw.selected_day.sleep_factors,
    },
    bio_age: {
      chronological,
      value: raw.bio_age.metric.value,
      confidence: Math.round(raw.bio_age.metric.coverage * 100),
      components: Object.entries(raw.bio_age.components).map(([name, component]) => ({
        name: componentNames[name] ?? name,
        value: component.applied_weight * 100,
        age_equivalent: component.age_equivalent,
        impact: component.age_equivalent == null
          ? null
          : Math.round((component.age_equivalent - chronological) * component.applied_weight * 100) / 100,
        available: component.status !== 'unavailable' && component.age_equivalent != null,
      })),
    },
    quality: {
      score: Math.round(raw.quality.overall_coverage * 100),
      status: raw.quality.overall_coverage >= 0.9 ? 'Высокое' : raw.quality.overall_coverage >= 0.7 ? 'Среднее' : 'Низкое',
      coverage: raw.quality.overall_coverage,
      missing_metrics: raw.quality.missing_signals,
      warnings: raw.quality.warnings,
      demo: true,
    },
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(!(init?.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // The status text is used when a non-JSON server error is returned.
    }
    throw new ApiError(apiErrorMessage(body, response.statusText || 'Ошибка API'), response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function isDashboardResponse(
  response: RawDashboardResponse | DashboardResponse,
): response is DashboardResponse {
  return 'selected' in response && 'period' in response.range
}

export function getDashboard(period: Period, date: string) {
  const params = new URLSearchParams({ period: String(period), date })
  return apiFetch<RawDashboardResponse | DashboardResponse>(`/dashboard?${params.toString()}`).then((response) => {
    // The public API contract is already shaped for the dashboard. The legacy
    // adapter keeps local datasets created by older backend builds readable.
    if (isDashboardResponse(response)) return response
    return normalizeDashboard(response)
  })
}

export function activateDemo(scenario: DemoScenario) {
  return apiFetch<{ scenario: DemoScenario; days: number; start_date: string; end_date: string }>('/demo/activate', {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  })
}

export function inspectImport(files: File[], onProgress?: (value: number) => void) {
  return new Promise<ImportInspectionResponse>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${API_BASE}/imports/inspect`)
    request.setRequestHeader('Accept', 'application/json')

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new ApiError('Не удалось связаться с локальным API', 0))
    request.onload = () => {
      let body: RawImportReport | ApiErrorBody
      try {
        body = JSON.parse(request.responseText) as RawImportReport | ApiErrorBody
      } catch {
        reject(new ApiError('Сервер вернул некорректный ответ', request.status))
        return
      }
      if (request.status < 200 || request.status >= 300) {
        const error = body as ApiErrorBody
        reject(new ApiError(apiErrorMessage(error, 'Ошибка проверки файлов'), request.status))
        return
      }
      onProgress?.(100)
      const report = body as RawImportReport
      resolve({
        import_id: null,
        recognized: report.recognized.map((item) => ({
          metric: item.category ?? item.name,
          file: item.name,
          status: report.parser_available ? 'recognized' : 'inspected',
          parser: report.parser_available ? 'Mi Fitness' : null,
          message: item.encoding ? `${item.encoding} · ${item.columns.length} колонок` : item.error,
        })),
        missing: report.missing.map((metric) => ({ metric, status: 'missing' })),
        unknown: report.unknown.map((item) => ({
          metric: item.category ?? 'Неизвестный CSV',
          file: item.name,
          status: 'unknown',
          message: item.error,
        })),
        errors: report.errors.map((item) => ({
          metric: item.code,
          file: item.file,
          status: 'error',
          message: item.message,
        })),
        parsers: report.parser_available ? ['Mi Fitness'] : [],
      })
    }

    const data = new FormData()
    files.forEach((file) => data.append('files', file, file.name))
    request.send(data)
  })
}

export function activateImport(importId: string, profile: Partial<Profile>) {
  return apiFetch<{ ok?: boolean }>('/imports/activate', {
    method: 'POST',
    body: JSON.stringify({ import_id: importId, profile }),
  })
}

export function updateProfile(profile: Partial<Profile>) {
  const payload = {
    age: profile.age,
    sex: profile.sex,
    weight_kg: profile.weight_kg,
    height_cm: profile.height_cm,
    sleep_need_hours: profile.sleep_need_hours,
    timezone: profile.timezone,
    baseline_window_days: profile.baseline_window_days,
  }
  return apiFetch<Profile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
