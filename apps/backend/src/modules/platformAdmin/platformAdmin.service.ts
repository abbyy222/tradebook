import { PlatformAdminBusinessesQuery, PlatformAdminRangeQuery } from './platformAdmin.schema'
import { platformAdminRepository } from './platformAdmin.repository'
import { platformDevService } from '../platformDev/platformDev.service'

const OVERVIEW_CACHE_TTL_MS = 30_000
const DIRECTORY_CACHE_TTL_MS = 20_000

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const overviewCache = new Map<string, CacheEntry<any>>()
const directoryCache = new Map<string, CacheEntry<any>>()

const readFreshCache = <T>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    cache.delete(key)
    return null
  }
  return hit.value
}

const writeCache = <T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) => {
  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  })
}

const clearAdminCaches = () => {
  overviewCache.clear()
  directoryCache.clear()
}

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
    const cacheKey = `overview:${query.days}`
    const cached = readFreshCache(overviewCache, cacheKey)
    if (cached) return cached

    const now = new Date()
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - (query.days - 1))

    const row = await platformAdminRepository.getOverview(from)

    const response = {
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
    writeCache(overviewCache, cacheKey, response, OVERVIEW_CACHE_TTL_MS)
    return response
  },

  async getBusinessesDirectory(query: PlatformAdminBusinessesQuery) {
    const cacheKey = `directory:${JSON.stringify(query)}`
    const cached = readFreshCache(directoryCache, cacheKey)
    if (cached) return cached

    const result = await platformAdminRepository.getBusinesses(query)
    const totalPages = Math.max(1, Math.ceil(result.total / query.pageSize))

    const response = {
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
    writeCache(directoryCache, cacheKey, response, DIRECTORY_CACHE_TTL_MS)
    return response
  },

  async updateBusinessStatus(input: {
    traderId: string
    accountStatus: 'ACTIVE' | 'SUSPENDED'
    reason: string
    actorInternalUserId: string
  }) {
    const result = await platformAdminRepository.updateBusinessStatus(input)
    clearAdminCaches()
    return { data: result, error: null }
  },

  async getBusinessActionLogs(query: { page: number; pageSize: number; traderId?: string }) {
    const result = await platformAdminRepository.listBusinessActionLogs(query)
    const totalPages = Math.max(1, Math.ceil(result.total / query.pageSize))

    return {
      data: {
        items: result.items,
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

  async repairBusinessSync(input: {
    traderId: string
    reason: string
    actorInternalUserId: string
  }) {
    const result = await platformDevService.forceResync({
      traderId: input.traderId,
      modules: ['SALES', 'EXPENSES', 'STOCK', 'DEBTORS', 'SAVINGS', 'SUPPLIERS'],
    })

    return {
      data: {
        traderId: input.traderId,
        reason: input.reason,
        actorInternalUserId: input.actorInternalUserId,
        repairedAt: new Date().toISOString(),
        requeue: result.data,
      },
      error: null,
    }
  },
}
