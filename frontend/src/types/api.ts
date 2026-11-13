export type Maybe<T> = T | null | undefined
export type Period = 7 | 30 | 90
export type DemoScenario = 'full' | 'short_baseline' | 'missing_sensors'
export type MetricStatus = 'good' | 'normal' | 'attention' | 'low' | 'high' | 'missing' | string

export interface MetricValue {
  value: Maybe<number>
  unit: Maybe<string>
  status: Maybe<MetricStatus>
  reason: Maybe<string>
  source: Maybe<string>
  coverage: Maybe<number>
  baseline: Maybe<number>
  delta: Maybe<number>
}

export interface Profile {
  name?: Maybe<string>
  age: number
  sex: 'male' | 'female'
  height_cm: number
  weight_kg: number
  sleep_need_hours: number
  timezone: string
  baseline_window_days: number
  demo_scenario?: Maybe<DemoScenario>
}

export interface DailyPoint {
  date: string
  load: Maybe<number>
  readiness: Maybe<number>
  sleep_score: Maybe<number>
  sleep_debt: Maybe<number>
  stress_7d: Maybe<number>
  hrv: Maybe<number>
  rhr: Maybe<number>
  spo2: Maybe<number>
  vo2max: Maybe<number>
  bio_age: Maybe<number>
  bedtime: Maybe<string>
  wake_time: Maybe<string>
  total_sleep_hours: Maybe<number>
  efficiency: Maybe<number>
}

export interface HeartRateZone {
  zone: string
  minutes: Maybe<number>
  contribution: Maybe<number>
}

export interface SleepStage {
  stage: string
  start: string
  end: string
  duration_minutes: Maybe<number>
}

export interface SleepFactors {
  duration?: Maybe<number>
  efficiency?: Maybe<number>
  regularity?: Maybe<number>
  deep_sleep?: Maybe<number>
  rem_sleep?: Maybe<number>
  timing?: Maybe<number>
  [key: string]: Maybe<number> | undefined
}

export interface BioAgeComponent {
  name: string
  value: Maybe<number>
  age_equivalent: Maybe<number>
  impact: Maybe<number>
  available: boolean
}

export interface DashboardResponse {
  profile: Profile
  range: {
    period: Period
    selected_date: string
    from: string
    to: string
  }
  summary: {
    readiness: MetricValue
    load: MetricValue
    sleep_score: MetricValue
    bio_age: MetricValue
    sleep_debt: MetricValue
  }
  coach: {
    target_min: Maybe<number>
    target_max: Maybe<number>
    title: Maybe<string>
    message: Maybe<string>
  }
  daily: DailyPoint[]
  selected: {
    date: string
    zones: HeartRateZone[]
    sleep_stages: SleepStage[]
    sleep_factors: SleepFactors
  }
  bio_age: {
    chronological: Maybe<number>
    value: Maybe<number>
    confidence: Maybe<number>
    components: BioAgeComponent[]
  }
  quality: {
    score: Maybe<number>
    status: Maybe<string>
    coverage: Maybe<number>
    missing_metrics: string[]
    warnings: string[]
    demo: boolean
  }
}

export interface ImportMetricInspection {
  metric: string
  file?: Maybe<string>
  status?: Maybe<'recognized' | 'missing' | 'unknown' | 'error' | string>
  parser?: Maybe<string>
  message?: Maybe<string>
}

export interface ImportInspectionResponse {
  import_id: Maybe<string>
  recognized: ImportMetricInspection[]
  missing: ImportMetricInspection[]
  unknown: ImportMetricInspection[]
  errors: ImportMetricInspection[]
  parsers?: string[]
  profile?: Partial<Profile>
}

export interface ApiErrorBody {
  detail?: string | { message?: string; code?: string } | Array<{ msg?: string }>
  message?: string
}
