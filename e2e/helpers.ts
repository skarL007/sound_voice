import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { join } from 'path'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'

const MAIN_ENTRY = join(__dirname, '..', 'out', 'main', 'index.js')

/**
 * Launch the built Electron app with an isolated userData dir (so tests never
 * touch real settings) and the Edge TTS mock enabled (no network on CI).
 *
 * Pass an existing `userDataDir` to relaunch against the same profile — that's
 * how the persistence tests verify settings survive a restart.
 */
export async function launchApp(
  opts: { userDataDir?: string; env?: Record<string, string> } = {},
): Promise<{ app: ElectronApplication; page: Page; userDataDir: string }> {
  const userDataDir = opts.userDataDir ?? mkdtempSync(join(tmpdir(), 'voicelaunch-e2e-'))
  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      VOICELAUNCH_EDGE_MOCK: '1',
      VOICELAUNCH_USER_DATA: userDataDir,
      ...opts.env,
    },
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page, userDataDir }
}

/** Dismiss the onboarding tutorial if it is showing, so tests reach the app. */
export async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: /skip tutorial/i }).first()
  try {
    if (await skip.isVisible({ timeout: 4_000 })) {
      await skip.click()
      await skip.waitFor({ state: 'hidden', timeout: 4_000 })
    }
  } catch {
    /* onboarding not shown */
  }
}
