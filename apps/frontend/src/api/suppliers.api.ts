import { apiClient } from './client'
import type { CreateSupplierDTO, CursorPaginatedResponse, SupplierDTO, UpdateSupplierDTO } from '@tradebook/shared-types'

export const suppliersApi = {
  sync: async (data: CreateSupplierDTO) => {
    const res = await apiClient.post<{ data: SupplierDTO }>('/suppliers/sync', data)
    return res.data.data
  },

  list: async (params: { cursor?: string; pageSize?: number; search?: string }) => {
    const res = await apiClient.get<CursorPaginatedResponse<SupplierDTO>>('/suppliers', { params })
    return res.data
  },

  update: async (id: string, data: UpdateSupplierDTO) => {
    const res = await apiClient.patch<{ data: { updated: boolean } }>(`/suppliers/${id}`, data)
    return res.data.data
  },

  delete: async (id: string) => {
    const res = await apiClient.delete<{ data: { deleted: boolean } }>(`/suppliers/${id}`)
    return res.data.data
  },
}
