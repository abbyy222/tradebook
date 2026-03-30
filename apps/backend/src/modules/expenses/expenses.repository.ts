import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateExpenseInput, ListExpensesQuery } from './expenses.schema'

const expenseSelect = {
  id: true,
  description: true,
  amount: true,
  category: true,
  expenseType: true,
  frequency: true,
  note: true,
  syncStatus: true,
  spentAt: true,
  startDate: true,
  endDate: true,
  nextDueDate: true,
  createdAt: true,
} satisfies Prisma.ExpenseSelect

const toExpenseWriteInput = (traderId: string, data: CreateExpenseInput): Prisma.ExpenseUncheckedCreateInput => ({
  id: data.id,
  traderId,
  description: data.description,
  amount: new Prisma.Decimal(data.amount),
  category: data.category,
  expenseType: data.expenseType,
  frequency: data.expenseType === 'RECURRING' ? data.frequency ?? null : null,
  note: data.note?.trim() || null,
  syncStatus: 'SYNCED',
  spentAt: new Date(data.spentAt),
  startDate: data.startDate ? new Date(data.startDate) : null,
  endDate: data.endDate ? new Date(data.endDate) : null,
  nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
})

export const expensesRepository = {
  async upsert(traderId: string, data: CreateExpenseInput) {
    return prisma.expense.upsert({
      where: { id: data.id },
      create: toExpenseWriteInput(traderId, data),
      update: {
        description: data.description,
        amount: new Prisma.Decimal(data.amount),
        category: data.category,
        expenseType: data.expenseType,
        frequency: data.expenseType === 'RECURRING' ? data.frequency ?? null : null,
        note: data.note?.trim() || null,
        syncStatus: 'SYNCED',
        spentAt: new Date(data.spentAt),
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      },
      select: expenseSelect,
    })
  },

  async bulkUpsert(traderId: string, expenses: CreateExpenseInput[]) {
    return prisma.$transaction(
      expenses.map(expense =>
        prisma.expense.upsert({
          where: { id: expense.id },
          create: toExpenseWriteInput(traderId, expense),
          update: {
            description: expense.description,
            amount: new Prisma.Decimal(expense.amount),
            category: expense.category,
            expenseType: expense.expenseType,
            frequency: expense.expenseType === 'RECURRING' ? expense.frequency ?? null : null,
            note: expense.note?.trim() || null,
            syncStatus: 'SYNCED',
            spentAt: new Date(expense.spentAt),
            startDate: expense.startDate ? new Date(expense.startDate) : null,
            endDate: expense.endDate ? new Date(expense.endDate) : null,
            nextDueDate: expense.nextDueDate ? new Date(expense.nextDueDate) : null,
          },
          select: expenseSelect,
        })
      )
    )
  },

  async findMany(traderId: string, query: ListExpensesQuery) {
    const { cursor, pageSize, from, to, category, expenseType, frequency } = query

    const where: Prisma.ExpenseWhereInput = {
      traderId,
      ...(from || to || cursor
        ? {
            spentAt: {
              ...(cursor && { lt: new Date(cursor) }),
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(category && { category }),
      ...(expenseType && { expenseType }),
      ...(frequency && { frequency }),
    }

    const raw = await prisma.expense.findMany({
      where,
      select: expenseSelect,
      orderBy: { spentAt: 'desc' },
      take: pageSize + 1,
    })

    const hasNextPage = raw.length > pageSize
    const expenses = hasNextPage ? raw.slice(0, pageSize) : raw
    const nextCursor = hasNextPage && expenses.length > 0
      ? expenses[expenses.length - 1].spentAt.toISOString()
      : null

    return { expenses, nextCursor, hasNextPage }
  },

  async getCategoryBreakdown(traderId: string, from: Date, to: Date) {
    return prisma.expense.groupBy({
      by: ['category'],
      where: { traderId, spentAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    })
  },

  async getTotalForPeriod(traderId: string, from?: Date, to?: Date) {
    return prisma.expense.aggregate({
      where: {
        traderId,
        ...(from || to
          ? {
              spentAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    })
  },

  async findById(id: string, traderId: string) {
    return prisma.expense.findFirst({
      where: { id, traderId },
      select: expenseSelect,
    })
  },

  async delete(id: string, traderId: string) {
    return prisma.expense.deleteMany({ where: { id, traderId } })
  },
}