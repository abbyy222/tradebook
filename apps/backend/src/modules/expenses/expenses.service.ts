// src/modules/expenses/expenses.service.ts

import { expensesRepository } from './expenses.repository'
import {
  CreateExpenseInput,
  SyncExpensesInput,
  ListExpensesQuery,
} from './expenses.schema'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'

const toExpenseDTO = (expense: any) => ({
  ...expense,
  amount: Number(expense.amount),
  spentAt: expense.spentAt.toISOString(),
  createdAt: expense.createdAt.toISOString(),
})

export const expensesService = {

  async syncExpense(traderId: string, input: CreateExpenseInput) {
    const expense = await expensesRepository.upsert(traderId, input)
    return toExpenseDTO(expense)
  },

  async syncBatch(traderId: string, input: SyncExpensesInput) {
    logger.info({
      event: 'bulk_sync_expenses',
      traderId,
      count: input.expenses.length,
    })
    const synced = await expensesRepository.bulkUpsert(traderId, input.expenses)
    return { synced: synced.length, expenses: synced.map(toExpenseDTO) }
  },

  async listExpenses(traderId: string, query: ListExpensesQuery) {
    const result = await expensesRepository.findMany(traderId, query)
    return {
      data: result.expenses.map(toExpenseDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  // --- Category breakdown for insights ---
  // We also calculate the percentage each category represents
  // of total spending. The frontend can use this to draw a
  // simple bar chart without doing any maths itself.
  async getCategoryBreakdown(traderId: string, from: Date, to: Date) {
    const breakdown = await expensesRepository.getCategoryBreakdown(
      traderId,
      from,
      to
    )

    const grandTotal = breakdown.reduce(
      (sum, row) => sum + Number(row._sum.amount ?? 0),
      0
    )

    return breakdown.map(row => ({
      category: row.category,
      total: Number(row._sum.amount ?? 0),
      count: row._count.id,
      // percentage rounded to 1 decimal place
      percentage:
        grandTotal > 0
          ? Math.round((Number(row._sum.amount ?? 0) / grandTotal) * 1000) / 10
          : 0,
    }))
  },

  async getExpense(id: string, traderId: string) {
    const expense = await expensesRepository.findById(id, traderId)
    if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND')
    return toExpenseDTO(expense)
  },

  async deleteExpense(id: string, traderId: string) {
    const result = await expensesRepository.delete(id, traderId)
    if (result.count === 0)
      throw new AppError('Expense not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}