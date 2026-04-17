let offlineUntil = 0
let isNetworkHealthInitialized = false
let offlineReloadTimer: number | null = null
const OFFLINE_COOLDOWN_MS = 20000
const OFFLINE_RELOAD_GUARD_KEY = 'tradebook:offline-reload-at'
const OFFLINE_RELOAD_GUARD_MS = 15000
const OFFLINE_RELOAD_DELAY_MS = 1200

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
  const path = window.location.pathname.toLowerCase()
  if (path === '/login' || path === '/register' || path === '/internal/login') return

  markOfflineReload()
  window.location.reload()
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
    if (offlineReloadTimer !== null) {
      window.clearTimeout(offlineReloadTimer)
    }
    // Wait briefly to avoid transient browser offline events canceling requests.
    offlineReloadTimer = window.setTimeout(() => {
      offlineReloadTimer = null
      if (!navigator.onLine) {
        reloadForOfflineMode()
      }
    }, OFFLINE_RELOAD_DELAY_MS)
  })

  window.addEventListener('online', () => {
    markNetworkSuccess()
    clearOfflineReloadMark()
    if (offlineReloadTimer !== null) {
      window.clearTimeout(offlineReloadTimer)
      offlineReloadTimer = null
    }
  })
}
