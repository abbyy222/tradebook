import { apiClient } from './client'
import type { CreateStockItemDTO, StockItemDTO, CursorPaginatedResponse } from '@tradebook/shared-types'

export const stockApi = {
  sync: async (data: CreateStockItemDTO) => {
    const res = await apiClient.post<{ data: StockItemDTO }>('/stock/sync', data)
    return res.data.data
  },

  list: async (
    params: { cursor?: string; pageSize?: number; lowStockOnly?: boolean; search?: string },
    options?: { timeoutMs?: number },
  ) => {
    const res = await apiClient.get<CursorPaginatedResponse<StockItemDTO>>('/stock', {
      params,
      ...(options?.timeoutMs ? { timeout: options.timeoutMs } : {}),
    })
    return res.data
  },

  getAlerts: async () => {
    const res = await apiClient.get<{ data: StockItemDTO[] }>('/stock/alerts')
    return res.data.data
  },

  adjust: async (id: string, delta: number, reason: string) => {
    const res = await apiClient.patch<{ data: StockItemDTO }>(`/stock/${id}/adjust`, { delta, reason })
    return res.data.data
  },
}
