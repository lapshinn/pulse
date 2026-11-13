import {
  Activity,
  CalendarDays,
  Dna,
  Gauge,
  HeartPulse,
  MoonStar,
  Upload,
  UserRound,
} from 'lucide-react'
import type { DashboardResponse, Period } from '../types/api'
import { formatLongDate, hasNumber } from '../utils/format'

export const dashboardSections = [
  { id: 'today', label: 'Сегодня', icon: Gauge },
  { id: 'load', label: 'Нагрузка', icon: Activity },
  { id: 'sleep', label: 'Сон', icon: MoonStar },
  { id: 'health', label: 'Здоровье', icon: HeartPulse },
  { id: 'bioage', label: 'БиоВозраст', icon: Dna },
] as const

interface HeaderProps {
  date: string
  minDate?: string
  maxDate?: string
  period: Period
  quality?: DashboardResponse['quality']
  profileName?: string | null
  onDateChange: (date: string) => void
  onPeriodChange: (period: Period) => void
  onImport: () => void
  onProfile: () => void
}

export function DashboardHeader({
  date,
  minDate,
  maxDate,
  period,
  quality,
  profileName,
  onDateChange,
  onPeriodChange,
  onImport,
  onProfile,
}: HeaderProps) {
  const qualityValue = hasNumber(quality?.score)
    ? Math.round(quality.score)
    : hasNumber(quality?.coverage)
      ? Math.round(quality.coverage)
      : null

  return (
    <header className="app-header">
      <a className="brand" href="#today" aria-label="Пульс — к началу">
        <span className="brand__mark"><HeartPulse size={19} aria-hidden="true" /></span>
        <span>
          <strong>Пульс</strong>
          <small>Локальное здоровье</small>
        </span>
      </a>

      <div className="date-control">
        <CalendarDays size={17} aria-hidden="true" />
        <label>
          <span className="sr-only">Выбранная дата</span>
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </label>
        <span className="date-control__formatted">{formatLongDate(date)}</span>
      </div>

      <fieldset className="period-control" aria-label="Период данных">
        {[7, 30, 90].map((item) => (
          <button
            type="button"
            key={item}
            className={period === item ? 'is-active' : ''}
            aria-pressed={period === item}
            onClick={() => onPeriodChange(item as Period)}
          >
            {item}д
          </button>
        ))}
      </fieldset>

      <div className="header-actions">
        <span
          className={`quality-pill ${quality?.status === 'low' ? 'quality-pill--warning' : ''}`}
          title={quality?.warnings?.join('. ') || 'Качество и полнота данных'}
        >
          <span className="quality-pill__dot" />
          <span>Данные</span>
          <strong>{qualityValue === null ? 'Н/Д' : `${qualityValue}%`}</strong>
        </span>
        <button type="button" className="button button--ghost header-action" onClick={onImport}>
          <Upload size={17} aria-hidden="true" />
          <span>Импорт</span>
        </button>
        <button type="button" className="profile-button" onClick={onProfile} aria-label="Открыть профиль">
          <UserRound size={17} aria-hidden="true" />
          <span>{profileName || 'Профиль'}</span>
        </button>
      </div>
    </header>
  )
}

export function AnchorNavigation({
  activeSection,
  onNavigate,
}: {
  activeSection: string
  onNavigate: (id: string) => void
}) {
  return (
    <>
      <nav className="anchor-nav" aria-label="Разделы дашборда">
        {dashboardSections.map(({ id, label, icon: Icon }) => (
          <a
            href={`#${id}`}
            key={id}
            className={activeSection === id ? 'is-active' : ''}
            aria-current={activeSection === id ? 'location' : undefined}
            onClick={() => onNavigate(id)}
          >
            <span>{label}</span>
            <Icon size={17} aria-hidden="true" />
          </a>
        ))}
      </nav>
      <nav className="mobile-nav" aria-label="Разделы дашборда">
        {dashboardSections.map(({ id, label, icon: Icon }) => (
          <a
            href={`#${id}`}
            key={id}
            className={activeSection === id ? 'is-active' : ''}
            aria-current={activeSection === id ? 'location' : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </>
  )
}
