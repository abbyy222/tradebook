import { useQuery } from '@tanstack/react-query'
import { db, type LocalDebtor, type LocalStockItem } from '@/db'
import { salesApi } from '@/api/sales.api'
import { debtorsApi } from '@/api/debtors.api'
import { stockApi } from '@/api/stock.api'
import type { DebtorDTO, StockItemDTO } from '@tradebook/shared-types'

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
  activeDebtors: DebtorDTO[]
  stockAlerts: StockItemDTO[]
}

const DASHBOARD_PREVIEW_LIMIT = 4

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const startOfWeek = () => {
  const now = new Date()
  const day = now.getDay()
  const offset = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - offset)
  monday.setHours(0, 0, 0, 0)
  return monday
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
  const [stats, activeDebtors, stockAlerts] = await Promise.all([
    buildLocalDashboardStats(),
    getLocalActiveDebtors(),
    getLocalStockAlerts(),
  ])

  return { stats, activeDebtors, stockAlerts }
}

export const useDashboardOverview = () => {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const [stats, debtorsPage, stockAlerts] = await Promise.all([
            salesApi.getDashboard(),
            debtorsApi.list({ pageSize: DASHBOARD_PREVIEW_LIMIT * 5 }),
            stockApi.getAlerts(),
          ])

          await Promise.all([
            storeServerDebtors(debtorsPage.data),
            storeServerStockItems(stockAlerts),
          ])

          return {
            stats,
            activeDebtors: debtorsPage.data
              .filter(isOwingDebtor)
              .slice(0, DASHBOARD_PREVIEW_LIMIT),
            stockAlerts: stockAlerts.slice(0, DASHBOARD_PREVIEW_LIMIT),
          }
        } catch {
          return getLocalDashboardOverview()
        }
      }

      return getLocalDashboardOverview()
    },
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
  })
}
const isOwingDebtor = (debtor: Pick<DebtorDTO, 'status' | 'balance'>) =>
  (debtor.status === 'ACTIVE' || debtor.status === 'PARTIAL') && debtor.balance > 0
