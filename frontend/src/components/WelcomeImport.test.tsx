import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { inspectImport } from '../api/client'
import { DataImportDialog } from './DataImportDialog'
import { WelcomeScreen } from './WelcomeScreen'

vi.mock('../api/client', () => ({
  inspectImport: vi.fn(),
  activateImport: vi.fn(),
}))

describe('Welcome and import', () => {
  it('запускает демо и открытие импорта с welcome-экрана', async () => {
    const user = userEvent.setup()
    const onDemo = vi.fn()
    const onUpload = vi.fn()
    render(<WelcomeScreen onDemo={onDemo} onUpload={onUpload} />)

    await user.click(screen.getByRole('button', { name: /Открыть демо/i }))
    await user.click(screen.getByRole('button', { name: /Загрузить данные/i }))

    expect(onDemo).toHaveBeenCalledOnce()
    expect(onUpload).toHaveBeenCalledOnce()
  })

  it('не закрывает мастер при частичных ошибках и блокирует импорт без парсера', async () => {
    const user = userEvent.setup()
    vi.mocked(inspectImport).mockResolvedValue({
      import_id: 'import-1',
      recognized: [],
      missing: [{ metric: 'HRV', status: 'missing' }],
      unknown: [],
      errors: [{ metric: 'sleep.csv', file: 'sleep.csv', status: 'error', message: 'Нет колонки date' }],
      parsers: [],
    })

    render(<DataImportDialog open onClose={vi.fn()} onActivated={vi.fn()} />)
    const input = screen.getByLabelText('Выбрать ZIP или CSV')
    await user.upload(input, new File(['date,hrv'], 'health.csv', { type: 'text/csv' }))
    await user.click(screen.getByRole('button', { name: /Проверить файлы/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Проверка структуры' })).toBeInTheDocument())
    expect(screen.getByText('Нет колонки date')).toBeInTheDocument()
    expect(screen.getByText(/Не найден подходящий парсер/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Подтвердить профиль/i }))
    expect(screen.getByRole('button', { name: /Активировать данные/i })).toBeDisabled()
    expect(screen.getByText(/активация станет доступна/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
