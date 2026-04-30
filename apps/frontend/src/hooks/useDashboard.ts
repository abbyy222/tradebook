import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, type LocalDebtor, type LocalStockItem } from '@/db'
import { salesApi } from '@/api/sales.api'
import { debtorsApi } from '@/api/debtors.api'
import { stockApi } from '@/api/stock.api'
import { isNetworkReachable } from '@/services/networkHealth'
import type { DayCloseSummaryDTO, DebtorDTO, ProfitLossSummaryDTO, StockItemDTO } from '@tradebook/shared-types'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
}

type DashboardStats = {
  today: { total: number; count: number }
  thisWeek: { total: number; count: number }
  allTime: { total: number; count: number }
}

type DashboardOverview = {
  stats: DashboardStats
  dayClose: DayCloseSummaryDTO
  operatingSnapshot: ProfitLossSummaryDTO
  activeDebtors: DebtorDTO[]
  stockAlerts: StockItemDTO[]
  dueReminders: Array<{
    id: string
    customerName: string
    balance: number
    dueDate: string
    urgency: 'OVERDUE' | 'TODAY' | 'SOON'
    daysDiff: number
  }>
}

const DASHBOARD_PREVIEW_LIMIT = 4
const REMINDER_PREVIEW_LIMIT = 5
const LAGOS_OFFSET_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const startOfToday = () => {
  const now = new Date()
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  lagosNow.setUTCHours(0, 0, 0, 0)
  return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
}

const startOfWeek = () => {
  const now = new Date()
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  const day = lagosNow.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  lagosNow.setUTCDate(lagosNow.getUTCDate() - offset)
  lagosNow.setUTCHours(0, 0, 0, 0)
  return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
}

const startOfMonth = () => {
  const now = new Date()
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  lagosNow.setUTCDate(1)
  lagosNow.setUTCHours(0, 0, 0, 0)
  return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
}

const buildLocalDashboardStats = async (): Promise<DashboardStats> => {
  const sales = await db.sales.toArray()
  const todayStart = startOfToday().getTime()
  const weekStart = startOfWeek().getTime()

  return sales.reduce<DashboardStats>(
    (acc, sale) => {
      const soldAt = new Date(sale.soldAt).getTime()

      acc.allTime.total += sale.amount
      acc.allTime.count += 1

      if (soldAt >= weekStart) {
        acc.thisWeek.total += sale.amount
        acc.thisWeek.count += 1
      }

      if (soldAt >= todayStart) {
        acc.today.total += sale.amount
        acc.today.count += 1
      }

      return acc
    },
    {
      today: { total: 0, count: 0 },
      thisWeek: { total: 0, count: 0 },
      allTime: { total: 0, count: 0 },
    }
  )
}

const buildLocalOperatingSnapshot = async (): Promise<ProfitLossSummaryDTO> => {
  const [sales, expenses, stockItems, debtors] = await Promise.all([
    db.sales.toArray(),
    db.expenses.toArray(),
    db.stockItems.toArray(),
    db.debtors.toArray(),
  ])

  const monthStart = startOfMonth().getTime()
  const revenueSales = sales.filter((sale) => new Date(sale.soldAt).getTime() >= monthStart)
  const monthExpenses = expenses.filter((expense) => new Date(expense.spentAt).getTime() >= monthStart)
  const receivables = debtors.filter(isOwingDebtor)

  const revenue = revenueSales.reduce((sum, sale) => sum + sale.amount, 0)
  const expenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const inventoryValue = stockItems.reduce((sum, item) => sum + item.quantity * item.costPrice, 0)
  const retailValue = stockItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const expectedMarginOnHand = stockItems.reduce((sum, item) => sum + item.quantity * (item.unitPrice - item.costPrice), 0)
  const unitsOnHand = stockItems.reduce((sum, item) => sum + item.quantity, 0)
  const receivablesTotal = receivables.reduce((sum, debtor) => sum + debtor.balance, 0)

  return {
    period: 'THIS_MONTH',
    revenue,
    expenseTotal,
    operatingProfit: revenue - expenseTotal,
    inventoryValue,
    retailValue,
    expectedMarginOnHand,
    receivablesTotal,
    salesCount: revenueSales.length,
    expenseCount: monthExpenses.length,
    unitsOnHand,
    activeDebtorsCount: receivables.length,
  }
}

const buildLocalDayCloseSummary = async (): Promise<DayCloseSummaryDTO> => {
  const { from, to } = getTodayBounds()
  const [sales, expenses, collections, savings] = await Promise.all([
    db.sales.toArray(),
    db.expenses.toArray(),
    db.debtorPayments.toArray(),
    db.savings.toArray(),
  ])

  const isWithinToday = (value: string) => {
    const at = new Date(value).getTime()
    return !Number.isNaN(at) && at >= from.getTime() && at <= to.getTime()
  }

  const todaySales = sales.filter((sale) => isWithinToday(sale.soldAt))
  const todayExpenses = expenses.filter((expense) => isWithinToday(expense.spentAt))
  const todayCollections = collections.filter((payment) => isWithinToday(payment.paidAt))
  const todaySavings = savings.filter((entry) => isWithinToday(entry.savedAt))

  const salesTotal = todaySales.reduce((sum, sale) => sum + sale.amount, 0)
  const cashTotal = todaySales
    .filter((sale) => sale.paymentType === 'CASH')
    .reduce((sum, sale) => sum + sale.amount, 0)
  const transferTotal = todaySales
    .filter((sale) => sale.paymentType === 'TRANSFER')
    .reduce((sum, sale) => sum + sale.amount, 0)
  const debtTotal = todaySales
    .filter((sale) => sale.paymentType === 'DEBT')
    .reduce((sum, sale) => sum + sale.amount, 0)
  const expenseTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const collectionsTotal = todayCollections.reduce((sum, payment) => sum + payment.amount, 0)
  const savingsTotal = todaySavings.reduce((sum, entry) => sum + entry.amount, 0)
  const eligibleSalesAfterExpenses = Math.max(cashTotal + transferTotal - expenseTotal, 0)

  return {
    period: {
      label: 'Today',
      from: from.toISOString(),
      to: to.toISOString(),
    },
    sales: {
      total: salesTotal,
      count: todaySales.length,
      cashTotal,
      transferTotal,
      debtTotal,
    },
    expenses: {
      total: expenseTotal,
      count: todayExpenses.length,
    },
    collections: {
      total: collectionsTotal,
      count: todayCollections.length,
    },
    savings: {
      total: savingsTotal,
      count: todaySavings.length,
      reconciledCount: todaySavings.filter((entry) => entry.status === 'RECONCILED').length,
      verifiedCount: todaySavings.filter((entry) => entry.status === 'VERIFIED').length,
    },
    net: {
      operatingBalance: salesTotal - expenseTotal,
      eligibleSalesAfterExpenses,
      stillAvailableToSave: Math.max(eligibleSalesAfterExpenses - savingsTotal, 0),
    },
    closure: {
      isClosed: false,
      closedAt: null,
      note: null,
      closedByTraderId: null,
    },
  }
}

const getLocalActiveDebtors = async () => {
  const debtors = await db.debtors.orderBy('createdAt').reverse().toArray()

  return debtors
    .filter(isOwingDebtor)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, DASHBOARD_PREVIEW_LIMIT)
}

const getLocalStockAlerts = async () => {
  const items = await db.stockItems.orderBy('itemName').toArray()

  return items
    .filter((item) => item.quantity <= item.lowStockThreshold)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, DASHBOARD_PREVIEW_LIMIT)
}

const getDueReminders = (debtors: DebtorDTO[]) => {
  const today = startOfToday()

  return debtors
    .filter((debtor) => isOwingDebtor(debtor) && debtor.dueDate)
    .map((debtor) => {
      const due = startOfDay(new Date(debtor.dueDate!))
      const daysDiff = Math.round((due.getTime() - today.getTime()) / DAY_MS)

      let urgency: 'OVERDUE' | 'TODAY' | 'SOON' | null = null
      if (daysDiff < 0) urgency = 'OVERDUE'
      else if (daysDiff === 0) urgency = 'TODAY'
      else if (daysDiff <= 3) urgency = 'SOON'

      if (!urgency) return null

      return {
        id: debtor.id,
        customerName: debtor.customerName,
        balance: debtor.balance,
        dueDate: debtor.dueDate!,
        urgency,
        daysDiff,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      if (a.daysDiff !== b.daysDiff) return a.daysDiff - b.daysDiff
      return b.balance - a.balance
    })
    .slice(0, REMINDER_PREVIEW_LIMIT)
}

const startOfDay = (date: Date) => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

const getTodayBounds = () => {
  const from = startOfToday()
  const to = new Date(from.getTime() + DAY_MS - 1)
  return { from, to }
}

const storeServerDebtors = async (debtors: DebtorDTO[]) => {
  if (debtors.length === 0) return

  const now = new Date().toISOString()
  const rows: LocalDebtor[] = debtors.map((debtor) => ({
    ...debtor,
    syncStatus: 'SYNCED',
    updatedAt: now,
  }))

  await db.debtors.bulkPut(rows)
}

const storeServerStockItems = async (items: StockItemDTO[]) => {
  if (items.length === 0) return

  const rows: LocalStockItem[] = items.map((item) => ({
    ...item,
    syncStatus: 'SYNCED',
  }))

  await db.stockItems.bulkPut(rows)
}

const getLocalDashboardOverview = async (): Promise<DashboardOverview> => {
  const [stats, dayClose, operatingSnapshot, activeDebtors, stockAlerts] = await Promise.all([
    buildLocalDashboardStats(),
    buildLocalDayCloseSummary(),
    buildLocalOperatingSnapshot(),
    getLocalActiveDebtors(),
    getLocalStockAlerts(),
  ])

  const localDebtors = await db.debtors.toArray()
  const dueReminders = getDueReminders(localDebtors)

  return { stats, dayClose, operatingSnapshot, activeDebtors, stockAlerts, dueReminders }
}

export const useDashboardOverview = () => {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: async () => {
      if (isNetworkReachable()) {
        try {
          const [dayClose, stats, operatingSnapshot, debtorsPage, stockAlerts] = await Promise.all([
            salesApi.getDayClose(),
            salesApi.getDashboard(),
            salesApi.getProfitLoss('THIS_MONTH'),
            debtorsApi.list({ pageSize: DASHBOARD_PREVIEW_LIMIT * 5 }),
            stockApi.getAlerts(),
          ])

          await Promise.all([
            storeServerDebtors(debtorsPage.data),
            storeServerStockItems(stockAlerts),
          ])

          return {
            dayClose,
            stats,
            operatingSnapshot,
            activeDebtors: debtorsPage.data
              .filter(isOwingDebtor)
              .slice(0, DASHBOARD_PREVIEW_LIMIT),
            stockAlerts: stockAlerts.slice(0, DASHBOARD_PREVIEW_LIMIT),
            dueReminders: getDueReminders(debtorsPage.data),
          }
        } catch {
          return getLocalDashboardOverview()
        }
      }

      return getLocalDashboardOverview()
    },
    staleTime: 120_000,
    refetchInterval: () => {
      if (typeof document === 'undefined') return false
      return document.visibilityState === 'visible' && isNetworkReachable() ? 15 * 60_000 : false
    },
    refetchIntervalInBackground: false,
  })
}

const isOwingDebtor = (debtor: Pick<DebtorDTO, 'status' | 'balance'>) =>
  (debtor.status === 'ACTIVE' || debtor.status === 'PARTIAL') && debtor.balance > 0

export const useCloseBusinessDay = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (note?: string) => salesApi.closeDay({ note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}
