import { expect, test } from '@playwright/test'

test('dashboard smoke flow', async ({ page }) => {
  await page.goto('/')
  const demoButton = page.getByRole('button', { name: /Открыть демо/i })
  if (await demoButton.isVisible()) {
    await demoButton.click()
  }

  await expect(page.getByRole('heading', { name: 'Сегодня' }).first()).toBeVisible()
  await expect(page.getByText('Готовность', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: '7д' }).click()
  await expect(page.getByRole('button', { name: '7д' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /Импорт/i }).click()
  await expect(page.getByRole('dialog', { name: 'Добавьте данные' })).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть импорт' }).click()

  await page.getByRole('link', { name: 'Сон' }).first().click()
  await expect(page.getByRole('heading', { name: 'Сон' }).first()).toBeVisible()
})
