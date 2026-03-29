// src/modules/expenses/expenses.repository.ts
// Identical structure to sales repository.
// The new addition is getCategoryBreakdown — an aggregate query
// that groups spending by category for the insights screen.

import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateExpenseInput, ListExpensesQuery } from './expenses.schema'

const expenseSelect = {
  id: true,
  description: true,
  amount: true,
  category: true,
  syncStatus: true,
  spentAt: true,
  createdAt: true,
} satisfies Prisma.ExpenseSelect

export const expensesRepository = {

  async upsert(traderId: string, data: CreateExpenseInput) {
    return prisma.expense.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        traderId,
        description: data.description,
        amount: new Prisma.Decimal(data.amount),
        category: data.category,
        syncStatus: 'SYNCED',
        spentAt: new Date(data.spentAt),
      },
      update: { syncStatus: 'SYNCED' },
      select: expenseSelect,
    })
  },

  async bulkUpsert(traderId: string, expenses: CreateExpenseInput[]) {
    return prisma.$transaction(
      expenses.map(expense =>
        prisma.expense.upsert({
          where: { id: expense.id },
          create: {
            id: expense.id,
            traderId,
            description: expense.description,
            amount: new Prisma.Decimal(expense.amount),
            category: expense.category,
            syncStatus: 'SYNCED',
            spentAt: new Date(expense.spentAt),
          },
          update: { syncStatus: 'SYNCED' },
          select: expenseSelect,
        })
      )
    )
  },

  async findMany(traderId: string, query: ListExpensesQuery) {
    const { cursor, pageSize, from, to, category } = query

    const where: Prisma.ExpenseWhereInput = {
      traderId,
      ...(cursor && { spentAt: { lt: new Date(cursor) } }),
      ...(from || to
        ? {
            spentAt: {
              ...(cursor && { lt: new Date(cursor) }),
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(category && { category }),
    }

    const raw = await prisma.expense.findMany({
      where,
      select: expenseSelect,
      orderBy: { spentAt: 'desc' },
      take: pageSize + 1,
    })

    const hasNextPage = raw.length > pageSize
    const expenses = hasNextPage ? raw.slice(0, pageSize) : raw
    const nextCursor =
      hasNextPage && expenses.length > 0
        ? expenses[expenses.length - 1].spentAt.toISOString()
        : null

    return { expenses, nextCursor, hasNextPage }
  },

  // --- Category breakdown ---
  // This powers the "Where is my money going?" insights screen.
  // groupBy is a SQL GROUP BY under the hood — Postgres sums each
  // category in one pass through the data rather than fetching
  // all records and summing in JavaScript (which would be very slow).
  async getCategoryBreakdown(traderId: string, from: Date, to: Date) {
    return prisma.expense.groupBy({
      by: ['category'],
      where: {
        traderId,
        spentAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } }, // biggest spend category first
    })
  },

  // --- Total for period ---
  // Used by the dashboard to show total outgoings this week.
  async getTotalForPeriod(traderId: string, from: Date, to: Date) {
    return prisma.expense.aggregate({
      where: {
        traderId,
        spentAt: { gte: from, lte: to },
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
    return prisma.expense.deleteMany({
      where: { id, traderId },
    })
  },
}