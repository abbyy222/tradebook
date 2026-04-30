// src/api/sales.api.ts
// Every function here is fully typed - the return type is inferred
// from the shared-types DTOs. If the backend changes a field name,
// TypeScript flags every place in the frontend that uses it.

import { apiClient } from './client'
import type {
  CloseDayInputDTO,
  CreateSaleDTO,
  DayCloseSummaryDTO,
  SaleDTO,
  CursorPaginatedResponse,
  ProfitLossPeriod,
  ProfitLossSummaryDTO,
} from '@tradebook/shared-types'

export const salesApi = {
  sync: async (data: CreateSaleDTO) => {
    const res = await apiClient.post<{ data: SaleDTO }>('/sales/sync', data)
    return res.data.data
  },

  syncBatch: async (sales: CreateSaleDTO[]) => {
    const res = await apiClient.post<{ data: { synced: number; sales: SaleDTO[] } }>(
      '/sales/sync/batch',
      { sales }
    )
    return res.data.data
  },

  list: async (params: {
    cursor?: string
    pageSize?: number
    from?: string
    to?: string
    paymentType?: 'CASH' | 'TRANSFER' | 'DEBT'
  }) => {
    const res = await apiClient.get<CursorPaginatedResponse<SaleDTO>>('/sales', { params })
    return res.data
  },

  getDashboard: async () => {
    const res = await apiClient.get<{
      data: {
        today: { total: number; count: number }
        thisWeek: { total: number; count: number }
        allTime: { total: number; count: number }
      }
    }>('/sales/dashboard')
    return res.data.data
  },

  getProfitLoss: async (period: ProfitLossPeriod = 'THIS_MONTH') => {
    const res = await apiClient.get<{ data: ProfitLossSummaryDTO }>('/sales/profit-loss', {
      params: { period },
    })
    return res.data.data
  },

  getDayClose: async () => {
    const res = await apiClient.get<{ data: DayCloseSummaryDTO }>('/sales/day-close')
    return res.data.data
  },

  closeDay: async (input: CloseDayInputDTO) => {
    const res = await apiClient.post<{ data: DayCloseSummaryDTO }>('/sales/day-close/close', input)
    return res.data.data
  },

  getOne: async (id: string) => {
    const res = await apiClient.get<{ data: SaleDTO }>(`/sales/${id}`)
    return res.data.data
  },

  delete: async (id: string) => {
    const res = await apiClient.delete<{ data: { deleted: boolean } }>(`/sales/${id}`)
    return res.data.data
  },
}
