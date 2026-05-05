import { expensesRepository } from './expenses.repository'
import { CreateExpenseInput, ListExpensesQuery, SyncExpensesInput } from './expenses.schema'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'
import { authRepository } from '../auth/auth.repository'

const toOptionalIso = (value: Date | null | undefined) => (value ? value.toISOString() : undefined)

const toExpenseDTO = (expense: any) => ({
  ...expense,
  amount: Number(expense.amount),
  spentAt: expense.spentAt.toISOString(),
  startDate: toOptionalIso(expense.startDate),
  endDate: toOptionalIso(expense.endDate),
  nextDueDate: toOptionalIso(expense.nextDueDate),
  createdAt: expense.createdAt.toISOString(),
})

export const expensesService = {
  async syncExpense(traderId: string, actorId: string, input: CreateExpenseInput) {
    const actor = await authRepository.findById(actorId)
    const expense = await expensesRepository.upsert(traderId, input, {
      actorTraderId: actorId,
      actorTraderName: actor?.name ?? 'Unknown staff',
    })
    return toExpenseDTO(expense)
  },

  async syncBatch(traderId: string, actorId: string, input: SyncExpensesInput) {
    logger.info({ event: 'bulk_sync_expenses', traderId, actorId, count: input.expenses.length })
    const actor = await authRepository.findById(actorId)
    const synced = await expensesRepository.bulkUpsert(traderId, input.expenses, {
      actorTraderId: actorId,
      actorTraderName: actor?.name ?? 'Unknown staff',
    })
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

  async getCategoryBreakdown(traderId: string, from: Date, to: Date) {
    const breakdown = await expensesRepository.getCategoryBreakdown(traderId, from, to)
    const grandTotal = breakdown.reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0)

    return breakdown.map(row => ({
      category: row.category,
      total: Number(row._sum.amount ?? 0),
      count: row._count.id,
      percentage: grandTotal > 0
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
    if (result.count === 0) throw new AppError('Expense not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}
