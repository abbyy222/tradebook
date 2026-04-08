import { apiClient } from './client'
import type { CreateCustomerDTO, CustomerDTO, CursorPaginatedResponse, UpdateCustomerDTO } from '@tradebook/shared-types'

export const customersApi = {
  sync: async (data: CreateCustomerDTO) => {
    const res = await apiClient.post<{ data: CustomerDTO }>('/customers/sync', data)
    return res.data.data
  },

  list: async (params: { cursor?: string; pageSize?: number; search?: string }) => {
    const res = await apiClient.get<CursorPaginatedResponse<CustomerDTO>>('/customers', { params })
    return res.data
  },

  update: async (id: string, data: UpdateCustomerDTO) => {
    const res = await apiClient.patch<{ data: { updated: boolean } }>(`/customers/${id}`, data)
    return res.data.data
  },

  delete: async (id: string) => {
    const res = await apiClient.delete<{ data: { deleted: boolean } }>(`/customers/${id}`)
    return res.data.data
  },
}
