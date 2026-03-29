// src/api/debtors.api.ts
import { apiClient } from './client'
import type {
  CreateDebtorDTO,
  DebtorDTO,
  RecordPaymentDTO,
  CursorPaginatedResponse,
} from '@tradebook/shared-types'

export const debtorsApi = {
  create: async (data: CreateDebtorDTO) => {
    const res = await apiClient.post<{ data: DebtorDTO }>('/debtors', data)
    return res.data.data
  },

  list: async (params: { cursor?: string; pageSize?: number; status?: string }) => {
    const res = await apiClient.get<CursorPaginatedResponse<DebtorDTO>>('/debtors', { params })
    return res.data
  },

  getOne: async (id: string) => {
    const res = await apiClient.get<{ data: DebtorDTO }>(`/debtors/${id}`)
    return res.data.data
  },

  recordPayment: async (id: string, data: RecordPaymentDTO) => {
    const res = await apiClient.post<{ data: DebtorDTO }>(`/debtors/${id}/payments`, data)
    return res.data.data
  },

  getPaymentHistory: async (id: string) => {
    const res = await apiClient.get<{ data: any[] }>(`/debtors/${id}/payments`)
    return res.data.data
  },
}
