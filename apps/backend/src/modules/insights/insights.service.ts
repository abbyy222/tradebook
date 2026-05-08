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

const formatMoney = (value: number) => `NGN ${Math.round(value).toLocaleString('en-NG')}`

const buildSmartWarnings = (input: {
  salesTotal: number
  expensesTotal: number
  operatingProfit: number
  activeDebtors: number
  syncFailed: number
  syncPending: number
  savingsCount: number
  topProducts: Array<{ itemName: string; unitsSold: number; revenue: number; estimatedProfit: number }>
}) => {
  const warnings: Array<{
    id: string
    severity: 'GOOD' | 'WATCH' | 'RISK'
    title: string
    message: string
    action: string
  }> = []

  const expenseLoad = input.salesTotal > 0 ? (input.expensesTotal / input.salesTotal) * 100 : 0

  if (input.salesTotal === 0) {
    warnings.push({
      id: 'no-sales',
      severity: 'WATCH',
      title: 'No sales in this window',
      message: 'There are no sales records for this period, so the business picture is still quiet.',
      action: 'Record sales as they happen so insights become useful.',
    })
  } else if (expenseLoad >= 70) {
    warnings.push({
      id: 'expense-load-high',
      severity: 'RISK',
      title: 'Expenses are eating sales',
      message: `Expenses are taking about ${expenseLoad.toFixed(0)}% of sales in this period.`,
      action: 'Review restock, transport, salary, and market-fee expenses before closing the day.',
    })
  } else if (expenseLoad >= 45) {
    warnings.push({
      id: 'expense-load-watch',
      severity: 'WATCH',
      title: 'Expense pressure is rising',
      message: `Expenses are at ${expenseLoad.toFixed(0)}% of sales. The business is still moving, but margin needs watching.`,
      action: 'Check whether today’s expenses are temporary or becoming a pattern.',
    })
  } else {
    warnings.push({
      id: 'expense-load-good',
      severity: 'GOOD',
      title: 'Expenses look controlled',
      message: `Expenses are about ${expenseLoad.toFixed(0)}% of sales in this period.`,
      action: 'Keep recording expenses consistently so this signal stays honest.',
    })
  }

  if (input.operatingProfit < 0) {
    warnings.push({
      id: 'negative-profit',
      severity: 'RISK',
      title: 'The period is running at a loss',
      message: `${formatMoney(Math.abs(input.operatingProfit))} more left the business than came in after expenses.`,
      action: 'Pause new spending and check whether recorded sales are complete.',
    })
  }

  if (input.activeDebtors > 0) {
    warnings.push({
      id: 'debtor-pressure',
      severity: input.activeDebtors >= 5 ? 'RISK' : 'WATCH',
      title: 'Cash is tied up in debtors',
      message: `${input.activeDebtors} customer${input.activeDebtors === 1 ? ' is' : 's are'} still owing the business.`,
      action: 'Use debtor statements and payment reminders to recover cash faster.',
    })
  }

  if (input.savingsCount === 0 && input.operatingProfit > 0) {
    warnings.push({
      id: 'savings-missed',
      severity: 'WATCH',
      title: 'Savings opportunity is open',
      message: 'The period has positive operating profit, but no savings entry has been recorded.',
      action: 'Record savings before closing the business day.',
    })
  }

  if (input.syncFailed > 0) {
    warnings.push({
      id: 'sync-failed',
      severity: 'RISK',
      title: 'Some records need repair',
      message: `${input.syncFailed} record${input.syncFailed === 1 ? '' : 's'} failed to sync.`,
      action: 'Repair sync before trusting reports for settlement or staff review.',
    })
  } else if (input.syncPending > 0) {
    warnings.push({
      id: 'sync-pending',
      severity: 'WATCH',
      title: 'Some records are still syncing',
      message: `${input.syncPending} record${input.syncPending === 1 ? ' is' : 's are'} waiting to sync.`,
      action: 'Keep the app online for a moment so the ledger catches up.',
    })
  }

  return warnings.slice(0, 5)
}

const buildMarketInsights = (
  trend: Array<{ date: string; salesCount: number; expensesCount: number; debtorsCount: number; savingsCount: number }>,
  input: {
    salesTotal: number
    expensesTotal: number
    operatingProfit: number
    topProducts: Array<{ itemName: string; unitsSold: number; revenue: number; estimatedProfit: number }>
    averageSaleValue: number
  },
) => {
  const busiest = trend.reduce((best, row) => (row.salesCount > best.salesCount ? row : best), trend[0] ?? {
    date: '',
    salesCount: 0,
    expensesCount: 0,
    debtorsCount: 0,
    savingsCount: 0,
  })
  const quietest = trend.reduce((best, row) => (row.salesCount < best.salesCount ? row : best), trend[0] ?? busiest)
  const topProduct = input.topProducts[0]
  const retention = input.salesTotal > 0 ? (input.operatingProfit / input.salesTotal) * 100 : 0

  return [
    {
      id: 'top-product',
      title: topProduct ? `${topProduct.itemName} is carrying profit` : 'No product winner yet',
      message: topProduct
        ? `${topProduct.itemName} produced ${formatMoney(topProduct.estimatedProfit)} estimated profit from ${topProduct.unitsSold} unit${topProduct.unitsSold === 1 ? '' : 's'}.`
        : 'Record stock-linked sales to reveal which products are really carrying the business.',
      metricLabel: 'Top product',
      metricValue: topProduct?.itemName ?? 'Waiting',
    },
    {
      id: 'sales-rhythm',
      title: busiest.salesCount > 0 ? 'Your busiest sales day is visible' : 'Sales rhythm is still forming',
      message: busiest.salesCount > 0
        ? `${busiest.date} had the strongest sales activity with ${busiest.salesCount} sale${busiest.salesCount === 1 ? '' : 's'}. Quietest day was ${quietest.date}.`
        : 'Once sales are recorded across a few days, TradeBook will show busy and quiet market patterns.',
      metricLabel: 'Peak day',
      metricValue: busiest.salesCount > 0 ? busiest.date.slice(5) : 'None',
    },
    {
      id: 'cash-retention',
      title: retention >= 20 ? 'The business is retaining value' : 'Revenue is not staying enough',
      message: input.salesTotal > 0
        ? `After expenses, the business retained about ${retention.toFixed(0)}% of sales in this period.`
        : 'Record sales and expenses to calculate cash retention.',
      metricLabel: 'Retention',
      metricValue: `${retention.toFixed(0)}%`,
    },
    {
      id: 'average-sale',
      title: 'Average sale value gives the market pulse',
      message: `Each sale is worth about ${formatMoney(input.averageSaleValue)} on average in this period.`,
      metricLabel: 'Avg sale',
      metricValue: formatMoney(input.averageSaleValue),
    },
  ]
}

const buildDayCloseRitual = (input: {
  salesCount: number
  salesTotal: number
  expensesTotal: number
  savingsCount: number
  activeDebtors: number
  operatingProfit: number
}) => {
  const checks = [
    {
      label: 'Sales captured',
      complete: input.salesCount > 0,
      message: input.salesCount > 0
        ? `${input.salesCount} sale${input.salesCount === 1 ? '' : 's'} recorded.`
        : 'No sales recorded yet.',
    },
    {
      label: 'Expenses reviewed',
      complete: input.expensesTotal <= input.salesTotal || input.salesTotal === 0,
      message: input.expensesTotal > input.salesTotal && input.salesTotal > 0
        ? 'Expenses are higher than sales.'
        : 'Expense pressure is within the current sales picture.',
    },
    {
      label: 'Savings decision',
      complete: input.savingsCount > 0 || input.operatingProfit <= 0,
      message: input.savingsCount > 0
        ? `${input.savingsCount} savings entr${input.savingsCount === 1 ? 'y' : 'ies'} recorded.`
        : input.operatingProfit > 0
          ? 'Profit exists, but savings has not been recorded.'
          : 'No savings pressure while profit is not positive.',
    },
    {
      label: 'Debtor pressure checked',
      complete: input.activeDebtors === 0,
      message: input.activeDebtors === 0
        ? 'No active debtor pressure.'
        : `${input.activeDebtors} active debtor${input.activeDebtors === 1 ? '' : 's'} still need attention.`,
    },
  ]

  const completed = checks.filter((check) => check.complete).length
  return {
    readinessPercent: Math.round((completed / checks.length) * 100),
    title: completed === checks.length ? 'Ready to close cleanly' : 'Close day with a few checks',
    message: completed === checks.length
      ? 'The business records look ready for a confident day close.'
      : 'TradeBook has found a few things to review before the day is closed.',
    checks,
  }
}

const buildDebtorTrustScores = (rows: Array<{
  id: string
  customerName: string
  phoneNumber: string | null
  totalOwed: number
  totalPaid: number
  balance: number
  dueDate: Date | null
  status: string
  paymentCount: number
  lastPaymentAt: Date | null
}>) => {
  const now = Date.now()

  return rows.map((row) => {
    const dueTime = row.dueDate?.getTime() ?? null
    const daysOverdue = dueTime && dueTime < now
      ? Math.ceil((now - dueTime) / (24 * 60 * 60 * 1000))
      : 0
    const paidRatio = row.totalOwed > 0 ? row.totalPaid / row.totalOwed : 1
    const lastPaymentDays = row.lastPaymentAt
      ? Math.floor((now - row.lastPaymentAt.getTime()) / (24 * 60 * 60 * 1000))
      : null

    let score = 55
    score += Math.min(25, paidRatio * 35)
    score += Math.min(10, row.paymentCount * 4)
    if (daysOverdue > 0) score -= Math.min(35, daysOverdue * 3)
    if (lastPaymentDays !== null && lastPaymentDays <= 14) score += 10
    if (row.balance <= 0) score = 100

    const rounded = Math.max(0, Math.min(100, Math.round(score)))
    const risk = rounded >= 75 ? 'LOW' : rounded >= 45 ? 'MEDIUM' : 'HIGH'

    return {
      debtorId: row.id,
      customerName: row.customerName,
      phoneNumber: row.phoneNumber,
      balance: row.balance,
      totalOwed: row.totalOwed,
      totalPaid: row.totalPaid,
      paymentCount: row.paymentCount,
      lastPaymentAt: row.lastPaymentAt ? row.lastPaymentAt.toISOString() : null,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      daysOverdue,
      score: rounded,
      risk,
      recommendation:
        risk === 'LOW'
          ? 'Safe customer, but still keep records tight.'
          : risk === 'MEDIUM'
            ? 'Give credit carefully and request part payment.'
            : 'Avoid new credit until this customer pays down the balance.',
    }
  })
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
    const activityTrend = buildTrend(from, query.days, metrics.trendRows)
    const smartWarnings = buildSmartWarnings({
      salesTotal: metrics.salesTotal,
      expensesTotal: metrics.expensesTotal,
      operatingProfit,
      activeDebtors: metrics.activeDebtors,
      syncFailed: metrics.sync.failed,
      syncPending: metrics.sync.pending,
      savingsCount: metrics.savingsCount,
      topProducts: metrics.topProducts,
    })
    const marketInsights = buildMarketInsights(activityTrend, {
      salesTotal: metrics.salesTotal,
      expensesTotal: metrics.expensesTotal,
      operatingProfit,
      topProducts: metrics.topProducts,
      averageSaleValue,
    })
    const dayCloseRitual = buildDayCloseRitual({
      salesCount: metrics.salesCount,
      salesTotal: metrics.salesTotal,
      expensesTotal: metrics.expensesTotal,
      savingsCount: metrics.savingsCount,
      activeDebtors: metrics.activeDebtors,
      operatingProfit,
    })

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
        activityTrend,
        dayCloseRitual,
        smartWarnings,
        marketInsights,
        debtorTrustScores: buildDebtorTrustScores(metrics.debtorTrustRows),
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
