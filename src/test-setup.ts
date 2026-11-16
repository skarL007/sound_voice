import { vi } from 'vitest'

// Les assertions existantes sont en anglais : on fige la langue detectee.
vi.stubGlobal('navigator', { language: 'en-US' })
