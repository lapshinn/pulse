import { render, screen } from '@testing-library/react'
import { MetricRing } from './MetricRing'

describe('MetricRing', () => {
  it('показывает Н/Д и доступное описание при отсутствии значения', () => {
    render(<MetricRing label="Сон" value={null} unit="балл" color="#a98bff" />)

    expect(screen.getByText('Н/Д')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Сон: нет данных/i })).toBeInTheDocument()
    expect(screen.queryByText('балл')).not.toBeInTheDocument()
  })
})
