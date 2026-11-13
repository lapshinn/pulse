import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { DashboardHeader } from './DashboardChrome'

describe('DashboardHeader', () => {
  it('переключает период и отражает выбранный вариант', async () => {
    const user = userEvent.setup()
    const onPeriodChange = vi.fn()
    render(
      <DashboardHeader
        date="2026-09-18"
        period={30}
        quality={{ score: 93, status: 'good', coverage: 93, missing_metrics: [], warnings: [], demo: false }}
        profileName="Иван"
        onDateChange={vi.fn()}
        onPeriodChange={onPeriodChange}
        onImport={vi.fn()}
        onProfile={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '30д' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '7д' }))
    expect(onPeriodChange).toHaveBeenCalledWith(7)
  })
})
