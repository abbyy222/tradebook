import { requestMetrics } from '../../observability/requestMetrics'
import { insightsRepository } from './insights.repository'
import { InsightsRangeQuery } from './insights.schema'

type TrendRows = {
  sales: Array<{ day: Date; count: number }>
  expenses: Array<{ day: Date; count: number }>
  debtors: Array<{ day: Date; count: number }>
  savings: Array<{ day: Date; count: number }>
}

const toDayKey = (value: Date) => value.toISOString().slice(0, 10)

const buildTrend = (from: Date, days: number, rows: TrendRows) => {
  const entries = new Map<
    string,
    { date: string; salesCount: number; expensesCount: number; debtorsCount: number; savingsCount: number }
  >()

  for (let i = 0; i < days; i += 1) {
    const day = new Date(from)
    day.setDate(from.getDate() + i)
    const date = toDayKey(day)
    entries.set(date, {
      date,
      salesCount: 0,
      expensesCount: 0,
      debtorsCount: 0,
      savingsCount: 0,
    })
  }

  const addCounts = (
    list: Array<{ day: Date; count: number }>,
    key: 'salesCount' | 'expensesCount' | 'debtorsCount' | 'savingsCount'
  ) => {
    for (const row of list) {
      const date = toDayKey(new Date(row.day))
      const current = entries.get(date)
      if (current) {
        current[key] = row.count
      }
    }
  }

  addCounts(rows.sales, 'salesCount')
  addCounts(rows.expenses, 'expensesCount')
  addCounts(rows.debtors, 'debtorsCount')
  addCounts(rows.savings, 'savingsCount')

  return Array.from(entries.values())
}

export const insightsService = {
  async getBusinessOverview(traderId: string, query: InsightsRangeQuery) {
    const now = new Date()
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - (query.days - 1))

    const metrics = await insightsRepository.getBusinessMetrics(traderId, from)
    const operatingProfit = metrics.salesTotal - metrics.expensesTotal
    const grossProfitEstimate = metrics.topProducts.reduce((sum, product) => sum + product.estimatedProfit, 0)
    const averageSaleValue = metrics.salesCount > 0 ? Number((metrics.salesTotal / metrics.salesCount).toFixed(2)) : 0

    return {
      data: {
        period: {
          days: query.days,
          from: from.toISOString(),
          to: now.toISOString(),
        },
        overview: {
          teamSize: metrics.teamSize,
          activeDebtors: metrics.activeDebtors,
          customers: metrics.customersCount,
          suppliers: metrics.suppliersCount,
          stockItems: metrics.stockItemsCount,
          transactionsRecorded:
            metrics.salesCount + metrics.expensesCount + metrics.debtorsCount + metrics.savingsCount,
          salesAmount: metrics.salesTotal,
          expensesAmount: metrics.expensesTotal,
          operatingProfit,
        },
        featureUsage: [
          { feature: 'Sales', count: metrics.salesCount },
          { feature: 'Expenses', count: metrics.expensesCount },
          { feature: 'Debtors', count: metrics.debtorsCount },
          { feature: 'Savings', count: metrics.savingsCount },
        ],
        syncHealth: {
          pending: metrics.sync.pending,
          failed: metrics.sync.failed,
        },
        profitability: {
          grossMarginEstimate: grossProfitEstimate,
          averageSaleValue,
          topProducts: metrics.topProducts,
        },
        activityTrend: buildTrend(from, query.days, metrics.trendRows),
      },
      error: null,
    }
  },

  async getDeveloperOverview() {
    const metrics = requestMetrics.getSummary(60 * 60 * 1000)
    const processMemory = process.memoryUsage()

    let database = {
      ok: false,
      latencyMs: null as number | null,
    }

    try {
      const latencyMs = await insightsRepository.pingDatabase()
      database = { ok: true, latencyMs }
    } catch {
      database = { ok: false, latencyMs: null }
    }

    return {
      data: {
        uptimeSeconds: Math.floor(process.uptime()),
        requestsLastHour: metrics.totalRequests,
        serverErrorsLastHour: metrics.errorRequests,
        errorRatePercent: metrics.errorRate,
        avgResponseMs: metrics.avgDurationMs,
        p95ResponseMs: metrics.p95DurationMs,
        topSlowEndpoints: metrics.topSlowEndpoints,
        topErrorEndpoints: metrics.topErrorEndpoints,
        process: {
          rssMb: Number((processMemory.rss / 1024 / 1024).toFixed(1)),
          heapUsedMb: Number((processMemory.heapUsed / 1024 / 1024).toFixed(1)),
        },
        database,
      },
      error: null,
    }
  },
}
