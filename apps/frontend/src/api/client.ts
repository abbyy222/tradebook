// src/api/client.ts
// Axios instance with interceptors.

import axios from 'axios'
import env from '@/config/env'
import { useAuthStore } from '@/stores/authStore'
import { isNetworkReachable, markNetworkFailure, markNetworkSuccess } from '@/services/networkHealth'

let hasAuthRedirected = false

export const apiClient = axios.create({
  baseURL: `${env.API_URL}/api/v1`,
  timeout: 2500,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  if (!isNetworkReachable()) {
    return Promise.reject(Object.assign(new Error('Offline mode active'), { code: 'OFFLINE_FAST_FAIL' }))
  }

  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
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
      if (!hasAuthRedirected) {
        hasAuthRedirected = true
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') {
          window.location.replace('/login')
        }
      }
    }
    return Promise.reject(error)
  }
)
