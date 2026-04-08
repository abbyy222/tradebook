// src/api/auth.api.ts
import { apiClient } from './client'
import type { RegisterDTO, LoginDTO, AuthResponseDTO, CreateSalespersonDTO, TraderDTO } from '@tradebook/shared-types'

export const authApi = {
  register: async (data: RegisterDTO) => {
    const res = await apiClient.post<{ data: AuthResponseDTO }>('/auth/register', data)
    return res.data.data
  },

  login: async (data: LoginDTO) => {
    const res = await apiClient.post<{ data: AuthResponseDTO }>('/auth/login', data)
    return res.data.data
  },

  createSalesperson: async (data: CreateSalespersonDTO) => {
    const res = await apiClient.post<{ data: TraderDTO }>('/auth/salespeople', data)
    return res.data.data
  },

  listSalespeople: async () => {
    const res = await apiClient.get<{ data: TraderDTO[] }>('/auth/salespeople')
    return res.data.data
  },

  logout: async () => {
    const res = await apiClient.post<{ data: { success: boolean } }>('/auth/logout')
    return res.data.data
  },
}
