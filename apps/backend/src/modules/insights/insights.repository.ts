import { prisma } from '../../prisma/client'

type CountByDayRow = {
  day: Date
  count: number
}

const getSalesCountByDay = (traderId: string, from: Date) =>
  prisma.$queryRaw<CountByDayRow[]>`
    SELECT date_trunc('day', sold_at) AS day, count(*)::int AS count
    FROM sales
    WHERE trader_id = ${traderId} AND sold_at >= ${from}
    GROUP BY 1
    ORDER BY 1 ASC
  `

const getExpensesCountByDay = (traderId: string, from: Date) =>
  prisma.$queryRaw<CountByDayRow[]>`
    SELECT date_trunc('day', spent_at) AS day, count(*)::int AS count
    FROM expenses
    WHERE trader_id = ${traderId} AND spent_at >= ${from}
    GROUP BY 1
    ORDER BY 1 ASC
  `

const getDebtorsCountByDay = (traderId: string, from: Date) =>
  prisma.$queryRaw<CountByDayRow[]>`
    SELECT date_trunc('day', created_at) AS day, count(*)::int AS count
    FROM debtors
    WHERE trader_id = ${traderId} AND created_at >= ${from}
    GROUP BY 1
    ORDER BY 1 ASC
  `

const getSavingsCountByDay = (traderId: string, from: Date) =>
  prisma.$queryRaw<CountByDayRow[]>`
    SELECT date_trunc('day', saved_at) AS day, count(*)::int AS count
    FROM savings_entries
    WHERE trader_id = ${traderId} AND saved_at >= ${from}
    GROUP BY 1
    ORDER BY 1 ASC
  `

export const insightsRepository = {
  async getBusinessMetrics(traderId: string, from: Date) {
    const [
      teamSize,
      salesCount,
      expensesCount,
      debtorsCount,
      stockItemsCount,
      savingsCount,
      customersCount,
      suppliersCount,
      activeDebtors,
      salesTotals,
      expenseTotals,
      salesPending,
      salesFailed,
      expensesPending,
      expensesFailed,
      stockPending,
      stockFailed,
      salesByDay,
      expensesByDay,
      debtorsByDay,
      savingsByDay,
    ] = await Promise.all([
      prisma.trader.count({ where: { OR: [{ id: traderId }, { ownerTraderId: traderId }] } }),
      prisma.sale.count({ where: { traderId, soldAt: { gte: from } } }),
      prisma.expense.count({ where: { traderId, spentAt: { gte: from } } }),
      prisma.debtor.count({ where: { traderId, createdAt: { gte: from } } }),
      prisma.stockItem.count({ where: { traderId } }),
      prisma.savingsEntry.count({ where: { traderId, savedAt: { gte: from } } }),
      prisma.customer.count({ where: { traderId } }),
      prisma.supplier.count({ where: { traderId } }),
      prisma.debtor.count({ where: { traderId, status: { in: ['ACTIVE', 'PARTIAL'] } } }),
      prisma.sale.aggregate({ where: { traderId, soldAt: { gte: from } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { traderId, spentAt: { gte: from } }, _sum: { amount: true } }),
      prisma.sale.count({ where: { traderId, syncStatus: 'PENDING' } }),
      prisma.sale.count({ where: { traderId, syncStatus: 'FAILED' } }),
      prisma.expense.count({ where: { traderId, syncStatus: 'PENDING' } }),
      prisma.expense.count({ where: { traderId, syncStatus: 'FAILED' } }),
      prisma.stockItem.count({ where: { traderId, syncStatus: 'PENDING' } }),
      prisma.stockItem.count({ where: { traderId, syncStatus: 'FAILED' } }),
      getSalesCountByDay(traderId, from),
      getExpensesCountByDay(traderId, from),
      getDebtorsCountByDay(traderId, from),
      getSavingsCountByDay(traderId, from),
    ])

    return {
      teamSize,
      salesCount,
      expensesCount,
      debtorsCount,
      stockItemsCount,
      savingsCount,
      customersCount,
      suppliersCount,
      activeDebtors,
      salesTotal: Number(salesTotals._sum.amount ?? 0),
      expensesTotal: Number(expenseTotals._sum.amount ?? 0),
      sync: {
        pending: salesPending + expensesPending + stockPending,
        failed: salesFailed + expensesFailed + stockFailed,
      },
      trendRows: {
        sales: salesByDay,
        expenses: expensesByDay,
        debtors: debtorsByDay,
        savings: savingsByDay,
      },
    }
  },

  async pingDatabase() {
    const started = Date.now()
    await prisma.$queryRaw`SELECT 1`
    return Date.now() - started
  },
}

