import { apiClient } from './client'
import type { CreateStockItemDTO, StockItemDTO, StockMovementDTO, CursorPaginatedResponse } from '@tradebook/shared-types'

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

  getMovements: async (id: string) => {
    const res = await apiClient.get<{ data: StockMovementDTO[] }>(`/stock/${id}/movements`)
    return res.data.data
  },

  adjust: async (
    id: string,
    input: {
      delta: number
      reason: string
      unitPrice?: number
      costPrice?: number
      wholesalePrice?: number | null
      wholesaleMinQty?: number | null
      lowStockThreshold?: number
    },
  ) => {
    const res = await apiClient.patch<{ data: StockItemDTO }>(`/stock/${id}/adjust`, input)
    return res.data.data
  },
}
