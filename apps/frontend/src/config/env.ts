// src/config/env.ts
// Mirror the backend pattern — validate env vars at startup.
// Vite exposes env vars prefixed with VITE_ to the browser.
// Never put secrets here — this code ships to the client.

const env = {
  API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  APP_ENV: import.meta.env.MODE,
} as const

export default env

