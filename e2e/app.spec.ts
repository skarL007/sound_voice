import { test, expect, type ElectronApplication } from '@playwright/test'
import { rmSync } from 'fs'
import { launchApp, dismissOnboarding } from './helpers'

let app: ElectronApplication | null = null
let userDataDir = ''

test.afterEach(async () => {
  if (app) {
    await app.close().catch(() => undefined)
    app = null
  }
  if (userDataDir) {
    rmSync(userDataDir, { recursive: true, force: true })
    userDataDir = ''
  }
})

test('app launches and shows the main navigation', async () => {
  const launched = await launchApp()
  app = launched.app
  userDataDir = launched.userDataDir
  const { page } = launched

  await dismissOnboarding(page)

  // Online-first: the app is usable even with the Python backend down.
  await expect(page.getByRole('link', { name: 'Speak' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shortcuts' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
})

test('mic status is graceful when VB-Cable is absent (no silent failure)', async () => {
  const launched = await launchApp()
  app = launched.app
  userDataDir = launched.userDataDir
  const { page } = launched

  await dismissOnboarding(page)
  await page.getByRole('link', { name: 'Settings' }).click()

  // The virtual-mic section always renders; without VB-Cable it must show the
  // "not detected" guidance rather than crashing or going silent.
  await expect(page.getByRole('heading', { name: 'Virtual microphone', exact: true })).toBeVisible()
  await expect(page.getByText(/CABLE Output|not detected/i).first()).toBeVisible()
})

test('accessibility settings persist across relaunch', async () => {
  const first = await launchApp()
  app = first.app
  userDataDir = first.userDataDir

  await dismissOnboarding(first.page)
  await first.page.getByRole('link', { name: 'Settings' }).click()

  const highContrast = first.page.getByRole('checkbox').first()
  await highContrast.check()
  await expect(highContrast).toBeChecked()

  // Give the debounced settings write time to flush, then relaunch same dir.
  await first.page.waitForTimeout(600)
  await app.close()

  const second = await launchApp({ userDataDir })
  app = second.app
  await dismissOnboarding(second.page)
  await second.page.getByRole('link', { name: 'Settings' }).click()
  await expect(second.page.getByRole('checkbox').first()).toBeChecked()
})

test('a created voice shortcut persists across relaunch', async () => {
  const first = await launchApp()
  app = first.app
  userDataDir = first.userDataDir

  await dismissOnboarding(first.page)
  await first.page.getByRole('link', { name: 'Shortcuts' }).click()
  // The Speak page has a field with the same placeholder; wait for the route to
  // switch, or the phrase lands there and Add on this page sees an empty draft.
  await expect(first.page.getByRole('heading', { name: 'Voice shortcuts', level: 1 })).toBeVisible()

  const phrase = 'E2E persisted shortcut'
  await first.page.getByPlaceholder(/what should the shortcut say/i).fill(phrase)
  // The voice list loads async on mount; clicking Add before it arrives only
  // shows the "Choose a voice" toast. Picking the mock voice waits for it.
  await first.page.getByRole('combobox', { name: 'New shortcut voice' }).selectOption('en-US-MockNeural')
  await first.page.getByRole('button', { name: /^Add$/ }).click()
  await expect(first.page.getByText(phrase).first()).toBeVisible()

  await first.page.waitForTimeout(600)
  await app.close()

  const second = await launchApp({ userDataDir })
  app = second.app
  await dismissOnboarding(second.page)
  await second.page.getByRole('link', { name: 'Shortcuts' }).click()
  await expect(second.page.getByText(phrase).first()).toBeVisible()
})
