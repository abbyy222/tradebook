import { apiClient } from './client'
import type { CreateSavingsEntryDTO, CursorPaginatedResponse, SavingsEntryDTO } from '@tradebook/shared-types'

export const savingsApi = {
  sync: async (data: CreateSavingsEntryDTO) => {
    const res = await apiClient.post<{ data: SavingsEntryDTO }>('/savings/sync', data)
    return res.data.data
  },

  list: async (params: { cursor?: string; pageSize?: number; from?: string; to?: string }) => {
    const res = await apiClient.get<CursorPaginatedResponse<SavingsEntryDTO>>('/savings', { params })
    return res.data
  },

  getTodaySummary: async () => {
    const res = await apiClient.get<{ data: { period: { from: string; to: string }; total: number } }>('/savings/summary/today')
    return res.data.data
  },
}
