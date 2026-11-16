import { vi } from 'vitest'

// Existing assertions are in English: pin the detected language.
vi.stubGlobal('navigator', { language: 'en-US' })
