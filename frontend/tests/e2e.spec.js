import { test, expect } from '@playwright/test'

const FRONTEND = 'http://localhost:5173'
const BACKEND = 'http://localhost:4000'

test('login and generate link', async ({ page }) => {
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: 'Login' }).click()
  await page.waitForSelector('input[placeholder="Email"]', { timeout: 20000 })
  await page.fill('input[placeholder="Email"]', 'admin@zylink.app')
  await page.fill('input[placeholder="Password"]', 'Pass1234!')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForURL('**/link-generator', { timeout: 20000 })
  await page.waitForSelector('input[placeholder="https://..."]', { timeout: 10000 })
  await page.fill('input[placeholder="https://..."]', 'https://www.walmart.com/')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.locator('text=Impact Link')).toBeVisible({ timeout: 15000 })
})

test('referrals page loads', async ({ page }) => {
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: 'Login' }).click()
  await page.waitForSelector('input[placeholder="Email"]')
  await page.fill('input[placeholder="Email"]', 'admin@zylink.app')
  await page.fill('input[placeholder="Password"]', 'Pass1234!')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForURL('**/link-generator')
  await page.getByRole('link', { name: 'Referrals' }).click()
  await expect(page.locator('text=Referrals')).toBeVisible({ timeout: 10000 })
})


