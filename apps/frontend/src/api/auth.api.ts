// src/api/auth.api.ts
import { apiClient } from './client'
import type { RegisterDTO, LoginDTO, AuthResponseDTO } from '@tradebook/shared-types'

export const authApi = {
  register: async (data: RegisterDTO) => {
    const res = await apiClient.post<{ data: AuthResponseDTO }>('/auth/register', data)
    return res.data.data
  },

  login: async (data: LoginDTO) => {
    const res = await apiClient.post<{ data: AuthResponseDTO }>('/auth/login', data)
    return res.data.data
  },
}