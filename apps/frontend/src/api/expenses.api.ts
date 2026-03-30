import { apiClient } from './client'
import type {
  CreateExpenseDTO,
  CursorPaginatedResponse,
  ExpenseCategory,
  ExpenseDTO,
  ExpenseFrequency,
  ExpenseType,
} from '@tradebook/shared-types'

export const expensesApi = {
  sync: async (data: CreateExpenseDTO) => {
    const res = await apiClient.post<{ data: ExpenseDTO }>('/expenses/sync', data)
    return res.data.data
  },

  syncBatch: async (expenses: CreateExpenseDTO[]) => {
    const res = await apiClient.post<{ data: { synced: number } }>('/expenses/sync/batch', { expenses })
    return res.data.data
  },

  list: async (params: {
    cursor?: string
    pageSize?: number
    from?: string
    to?: string
    category?: ExpenseCategory
    expenseType?: ExpenseType
    frequency?: ExpenseFrequency
  }) => {
    const res = await apiClient.get<CursorPaginatedResponse<ExpenseDTO>>('/expenses', { params })
    return res.data
  },

  getInsights: async (from: string, to: string) => {
    const res = await apiClient.get<{
      data: Array<{ category: string; total: number; count: number; percentage: number }>
    }>('/expenses/insights', { params: { from, to } })
    return res.data.data
  },
}