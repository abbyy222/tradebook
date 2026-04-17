let offlineUntil = 0
let isNetworkHealthInitialized = false
const OFFLINE_COOLDOWN_MS = 20000
const OFFLINE_RELOAD_GUARD_KEY = 'tradebook:offline-reload-at'
const OFFLINE_RELOAD_GUARD_MS = 15000

export const markNetworkFailure = () => {
  offlineUntil = Date.now() + OFFLINE_COOLDOWN_MS
}

export const markNetworkSuccess = () => {
  offlineUntil = 0
}

export const isNetworkReachable = () => {
  if (!navigator.onLine) return false
  return Date.now() >= offlineUntil
}

const hasRecentOfflineReload = () => {
  const raw = window.sessionStorage.getItem(OFFLINE_RELOAD_GUARD_KEY)
  if (!raw) return false
  const lastReloadAt = Number(raw)
  if (!Number.isFinite(lastReloadAt)) return false
  return Date.now() - lastReloadAt < OFFLINE_RELOAD_GUARD_MS
}

const markOfflineReload = () => {
  window.sessionStorage.setItem(OFFLINE_RELOAD_GUARD_KEY, String(Date.now()))
}

const clearOfflineReloadMark = () => {
  window.sessionStorage.removeItem(OFFLINE_RELOAD_GUARD_KEY)
}

const reloadForOfflineMode = () => {
  if (hasRecentOfflineReload()) return
  markOfflineReload()
  window.setTimeout(() => window.location.reload(), 120)
}

export const initNetworkHealth = () => {
  if (isNetworkHealthInitialized) return
  isNetworkHealthInitialized = true

  if (!navigator.onLine) {
    markNetworkFailure()
  } else {
    clearOfflineReloadMark()
  }

  window.addEventListener('offline', () => {
    markNetworkFailure()
    reloadForOfflineMode()
  })

  window.addEventListener('online', () => {
    markNetworkSuccess()
    clearOfflineReloadMark()
  })
}
