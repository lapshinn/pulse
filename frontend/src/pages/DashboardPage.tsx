import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { ApiError, activateDemo, getDashboard } from '../api/client'
import { AnchorNavigation, DashboardHeader, dashboardSections } from '../components/DashboardChrome'
import { DataImportDialog } from '../components/DataImportDialog'
import { ProfileDrawer } from '../components/ProfileDrawer'
import { WelcomeScreen } from '../components/WelcomeScreen'
import { BioAgeSection } from '../sections/BioAgeSection'
import { HealthSection } from '../sections/HealthSection'
import { LoadReadinessSection } from '../sections/LoadReadinessSection'
import { SleepSection } from '../sections/SleepSection'
import { TodaySection } from '../sections/TodaySection'
import { useUiStore } from '../store/ui'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const period = useUiStore((state) => state.period)
  const selectedDate = useUiStore((state) => state.selectedDate)
  const activeSection = useUiStore((state) => state.activeSection)
  const overlay = useUiStore((state) => state.overlay)
  const setPeriod = useUiStore((state) => state.setPeriod)
  const setSelectedDate = useUiStore((state) => state.setSelectedDate)
  const setActiveSection = useUiStore((state) => state.setActiveSection)
  const openOverlay = useUiStore((state) => state.openOverlay)
  const closeOverlay = useUiStore((state) => state.closeOverlay)
  const [welcomeMessage, setWelcomeMessage] = useState<string>()

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', period, selectedDate],
    queryFn: () => getDashboard(period, selectedDate),
    retry: false,
    staleTime: 30_000,
  })

  const demoMutation = useMutation({
    mutationFn: () => activateDemo('full'),
    onSuccess: async (activation) => {
      setWelcomeMessage(undefined)
      setSelectedDate(activation.end_date)
      await queryClient.removeQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      setWelcomeMessage(error instanceof Error ? error.message : 'Не удалось открыть демо.')
    },
  })

  const data = dashboardQuery.data
  const isEmpty = !data?.daily?.length
  const noDataset = dashboardQuery.error instanceof ApiError && dashboardQuery.error.status === 409

  useEffect(() => {
    if (!data?.range) return
    if (selectedDate < data.range.from || selectedDate > data.range.to) {
      setSelectedDate(data.range.to)
    }
  }, [data, selectedDate, setSelectedDate])

  useEffect(() => {
    if (!data) return
    const nodes = dashboardSections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActiveSection(visible.target.id)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [data, setActiveSection])

  const refresh = async () => {
    closeOverlay()
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  if (dashboardQuery.isPending) {
    return (
      <main className="app-loader" aria-live="polite">
        <div className="app-loader__orb"><LoaderCircle className="spin" aria-hidden="true" /></div>
        <strong>Собираем сигналы здоровья</strong>
        <span>Локальный API · 127.0.0.1</span>
      </main>
    )
  }

  if (noDataset || (!data && !dashboardQuery.isError)) {
    return (
      <>
        <WelcomeScreen
          onDemo={() => demoMutation.mutate()}
          onUpload={() => openOverlay('import')}
          demoPending={demoMutation.isPending}
          message={welcomeMessage ?? 'Данные ещё не подключены. Откройте демо или импортируйте свою историю.'}
        />
        <DataImportDialog
          open={overlay === 'import'}
          onClose={closeOverlay}
          onActivated={refresh}
        />
      </>
    )
  }

  if (dashboardQuery.isError) {
    const errorMessage = dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : 'Не удалось получить данные дашборда.'
    return (
      <main className="app-loader" aria-live="assertive">
        <strong>Локальный API не ответил</strong>
        <span>{errorMessage}</span>
        <div className="header-actions">
          <button type="button" className="button button--ghost" onClick={() => void dashboardQuery.refetch()}>
            Повторить
          </button>
          <button type="button" className="button button--primary" onClick={() => demoMutation.mutate()}>
            Открыть демо
          </button>
        </div>
      </main>
    )
  }

  if (isEmpty) {
    return (
      <>
        <WelcomeScreen
          onDemo={() => demoMutation.mutate()}
          onUpload={() => openOverlay('import')}
          demoPending={demoMutation.isPending}
          message={welcomeMessage ?? 'В выбранном наборе пока нет дневных записей.'}
        />
        <DataImportDialog
          open={overlay === 'import'}
          onClose={closeOverlay}
          onActivated={refresh}
        />
      </>
    )
  }

  return (
    <div className="app-shell">
      <DashboardHeader
        date={selectedDate}
        minDate={data.range.from}
        maxDate={data.range.to}
        period={period}
        quality={data.quality}
        profileName={data.profile?.name}
        onDateChange={setSelectedDate}
        onPeriodChange={setPeriod}
        onImport={() => openOverlay('import')}
        onProfile={() => openOverlay('profile')}
      />
      <main className="dashboard">
        {data.quality.demo && <div className="demo-ribbon">Демо · {data.profile.demo_scenario ?? 'полные данные'}</div>}
        <TodaySection data={data} />
        <LoadReadinessSection data={data} />
        <SleepSection data={data} />
        <HealthSection data={data} />
        <BioAgeSection data={data} />
      </main>
      <AnchorNavigation
        activeSection={activeSection}
        onNavigate={(id) => {
          setActiveSection(id)
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />
      <DataImportDialog
        open={overlay === 'import'}
        initialProfile={data.profile}
        onClose={closeOverlay}
        onActivated={refresh}
      />
      <ProfileDrawer
        open={overlay === 'profile'}
        profile={data.profile}
        demo={data.quality.demo}
        onClose={closeOverlay}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
      />
    </div>
  )
}
