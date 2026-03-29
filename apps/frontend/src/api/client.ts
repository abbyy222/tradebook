// src/api/client.ts
// Axios instance with interceptors.
// An interceptor is middleware for HTTP — it runs before every
// request and after every response automatically.
// We use it to:
// 1. Attach the JWT token to every outgoing request
// 2. Handle 401 responses globally (token expired → logout)

import axios from 'axios'
import env from '@/config/env'
import { useAuthStore } from '@/stores/authStore'

export const apiClient = axios.create({
  baseURL: `${env.API_URL}/api/v1`,
  timeout: 10000, // 10 second timeout — don't wait forever on bad connections
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — runs before every request goes out
apiClient.interceptors.request.use((config) => {
  // Get the token from Zustand auth store
  const token = useAuthStore.getState().token

  // If we have a token, attach it to the Authorization header.
  // The backend's authenticate middleware reads this header.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Response interceptor — runs after every response comes back
apiClient.interceptors.response.use(
  // Success: pass through unchanged
  (response) => response,

  // Error: handle globally before the calling code sees it
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth state and redirect to login.
      // This handles token expiry automatically everywhere in the app.
      // Without this, every API hook would need its own 401 handling.
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)