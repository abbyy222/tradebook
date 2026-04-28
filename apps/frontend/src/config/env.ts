// src/config/env.ts
// Mirror the backend pattern — validate env vars at startup.
// Vite exposes env vars prefixed with VITE_ to the browser.
// Never put secrets here — this code ships to the client.

const normalizeApiUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, '')}`
}

const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const apiUrl = normalizeApiUrl(rawApiUrl)

if (import.meta.env.PROD && !/^https?:\/\//i.test(rawApiUrl)) {
  // Helps catch broken env values in deployment logs/console.
  console.warn('VITE_API_URL is missing protocol, auto-prefixed with https://')
}

const env = {
  API_URL: apiUrl,
  APP_ENV: import.meta.env.MODE,
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@tradebook.app',
  DEV_SUPPORT_EMAIL: import.meta.env.VITE_DEV_SUPPORT_EMAIL ?? 'dev@tradebook.app',
  FLUTTERWAVE_PUBLIC_KEY: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ?? '',
} as const

export default env

