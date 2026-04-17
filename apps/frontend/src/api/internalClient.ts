import axios from 'axios'
import env from '@/config/env'
import { useInternalAuthStore } from '@/stores/internalAuthStore'
import { isNetworkReachable, markNetworkFailure, markNetworkSuccess } from '@/services/networkHealth'

let hasInternalAuthRedirected = false

export const internalApiClient = axios.create({
  baseURL: `${env.API_URL}/api/v1`,
  timeout: 2500,
  headers: { 'Content-Type': 'application/json' },
})

const isAuthRequest = (url?: string) => {
  if (!url) return false
  return /(^|\/)(auth|internal-auth)(\/|$)/i.test(url)
}

internalApiClient.interceptors.request.use((config) => {
  // Do not short-circuit auth/login requests with offline cooldown heuristics.
  if (!isAuthRequest(config.url) && !isNetworkReachable()) {
    return Promise.reject(Object.assign(new Error('Offline mode active'), { code: 'OFFLINE_FAST_FAIL' }))
  }

  const token = useInternalAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

internalApiClient.interceptors.response.use(
  (response) => {
    markNetworkSuccess()
    return response
  },
  (error) => {
    const hasNoResponse = !error?.response
    const isNetworkError =
      error?.code === 'ERR_NETWORK' ||
      error?.code === 'ECONNABORTED' ||
      error?.code === 'OFFLINE_FAST_FAIL'

    if (hasNoResponse || isNetworkError) {
      markNetworkFailure()
    }

    if (error.response?.status === 401) {
      if (!hasInternalAuthRedirected) {
        hasInternalAuthRedirected = true
        useInternalAuthStore.getState().logout()
        if (window.location.pathname !== '/internal/login') {
          window.location.replace('/internal/login')
        }
      }
    }
    return Promise.reject(error)
  }
)
