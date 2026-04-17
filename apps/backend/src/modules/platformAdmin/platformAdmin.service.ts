import { PlatformAdminBusinessesQuery, PlatformAdminRangeQuery } from './platformAdmin.schema'
import { platformAdminRepository } from './platformAdmin.repository'

const toDayKey = (value: Date) => value.toISOString().slice(0, 10)

const buildDaily = (from: Date, days: number, rows: { salesByDay: Array<{ day: Date; count: number }>; expensesByDay: Array<{ day: Date; count: number }> }) => {
  const map = new Map<string, { date: string; salesCount: number; expensesCount: number }>()
  for (let i = 0; i < days; i += 1) {
    const day = new Date(from)
    day.setDate(day.getDate() + i)
    const key = toDayKey(day)
    map.set(key, { date: key, salesCount: 0, expensesCount: 0 })
  }

  for (const row of rows.salesByDay) {
    const key = toDayKey(new Date(row.day))
    const item = map.get(key)
    if (item) item.salesCount = row.count
  }
  for (const row of rows.expensesByDay) {
    const key = toDayKey(new Date(row.day))
    const item = map.get(key)
    if (item) item.expensesCount = row.count
  }

  return Array.from(map.values())
}

export const platformAdminService = {
  async getOverview(query: PlatformAdminRangeQuery) {
    const now = new Date()
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - (query.days - 1))

    const row = await platformAdminRepository.getOverview(from)

    return {
      data: {
        period: {
          days: query.days,
          from: from.toISOString(),
          to: now.toISOString(),
        },
        overview: {
          totalBusinesses: row.totalBusinesses,
          totalSalespeople: row.totalSalespeople,
          activeBusinesses: row.activeBusinesses,
          totalInternalAdmins: row.totalInternalAdmins,
          totalPlatformDevelopers: row.totalPlatformDevelopers,
          transactionsRecorded: row.salesCount + row.expensesCount + row.debtorsCount + row.savingsCount,
          salesAmount: row.salesAmount,
          expensesAmount: row.expensesAmount,
          netFlow: row.salesAmount - row.expensesAmount,
        },
        operations: {
          syncPending: row.operations.syncPending,
          syncFailed: row.operations.syncFailed,
          overdueDebtors: row.operations.overdueDebtors,
          recurringDueSoon: row.operations.recurringDueSoon,
        },
        modulesUsage: [
          { module: 'Sales', count: row.salesCount },
          { module: 'Expenses', count: row.expensesCount },
          { module: 'Debtors', count: row.debtorsCount },
          { module: 'Stock', count: row.stockItemsCount },
          { module: 'Savings', count: row.savingsCount },
        ],
        dailyActivity: buildDaily(from, query.days, row),
        recentBusinesses: row.topBusinesses,
      },
      error: null,
    }
  },

  async getBusinessesDirectory(query: PlatformAdminBusinessesQuery) {
    const result = await platformAdminRepository.getBusinesses(query)
    const totalPages = Math.max(1, Math.ceil(result.total / query.pageSize))

    return {
      data: {
        items: result.items,
        summary: result.summary,
        meta: {
          total: result.total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages,
        },
      },
      error: null,
    }
  },
}
