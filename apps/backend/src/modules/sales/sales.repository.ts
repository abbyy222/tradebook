import { CreateSaleInput, ListSalesQuery } from './sales.schema'
import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'

const LAGOS_OFFSET_MS = 60 * 60 * 1000

const getStartOfTodayInLagos = (now: Date) => {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  lagosNow.setUTCHours(0, 0, 0, 0)
  return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
}

const getStartOfWeekInLagos = (now: Date) => {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  const day = lagosNow.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  lagosNow.setUTCDate(lagosNow.getUTCDate() - offset)
  lagosNow.setUTCHours(0, 0, 0, 0)
  return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
}

const saleSelect = {
  id: true,
  itemName: true,
  stockItemId: true,
  quantity: true,
  unitPrice: true,
  amount: true,
  paymentType: true,
  debtorId: true,
  syncStatus: true,
  soldAt: true,
  createdAt: true,
} satisfies Prisma.SaleSelect

export const salesRepository = {
  async create(traderId: string, data: CreateSaleInput) {
    return prisma.sale.create({
      data: {
        id: data.id,
        traderId,
        stockItemId: data.stockItemId ?? null,
        itemName: data.itemName,
        quantity: data.quantity,
        unitPrice: new Prisma.Decimal(data.unitPrice),
        amount: new Prisma.Decimal(data.amount),
        paymentType: data.paymentType,
        debtorId: data.debtorId ?? null,
        syncStatus: 'SYNCED',
        soldAt: new Date(data.soldAt),
      },
      select: saleSelect,
    })
  },

  async upsert(traderId: string, data: CreateSaleInput) {
    return prisma.sale.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        traderId,
        stockItemId: data.stockItemId ?? null,
        itemName: data.itemName,
        quantity: data.quantity,
        unitPrice: new Prisma.Decimal(data.unitPrice),
        amount: new Prisma.Decimal(data.amount),
        paymentType: data.paymentType,
        debtorId: data.debtorId ?? null,
        syncStatus: 'SYNCED',
        soldAt: new Date(data.soldAt),
      },
      update: {
        syncStatus: 'SYNCED',
      },
      select: saleSelect,
    })
  },

  async bulkUpsert(traderId: string, sales: CreateSaleInput[]) {
    return prisma.$transaction(
      sales.map((sale) =>
        prisma.sale.upsert({
          where: { id: sale.id },
          create: {
            id: sale.id,
            traderId,
            stockItemId: sale.stockItemId ?? null,
            itemName: sale.itemName,
            quantity: sale.quantity,
            unitPrice: new Prisma.Decimal(sale.unitPrice),
            amount: new Prisma.Decimal(sale.amount),
            paymentType: sale.paymentType,
            debtorId: sale.debtorId ?? null,
            syncStatus: 'SYNCED',
            soldAt: new Date(sale.soldAt),
          },
          update: { syncStatus: 'SYNCED' },
          select: saleSelect,
        })
      )
    )
  },

  async findExistingIds(traderId: string, ids: string[]) {
    if (ids.length === 0) return new Set<string>()

    const rows = await prisma.sale.findMany({
      where: { traderId, id: { in: ids } },
      select: { id: true },
    })

    return new Set(rows.map((row) => row.id))
  },

  async findMany(traderId: string, query: ListSalesQuery) {
    const { cursor, pageSize, from, to, paymentType } = query

    const where: Prisma.SaleWhereInput = {
      traderId,
      ...(cursor ? { soldAt: { lt: new Date(cursor) } } : {}),
      ...(from || to
        ? {
            soldAt: {
              ...(cursor ? { lt: new Date(cursor) } : {}),
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(paymentType ? { paymentType } : {}),
    }

    const rawSales = await prisma.sale.findMany({
      where,
      select: saleSelect,
      orderBy: { soldAt: 'desc' },
      take: pageSize + 1,
    })

    const hasNextPage = rawSales.length > pageSize
    const sales = hasNextPage ? rawSales.slice(0, pageSize) : rawSales
    const nextCursor = hasNextPage && sales.length > 0 ? sales[sales.length - 1].soldAt.toISOString() : null

    return { sales, nextCursor, hasNextPage }
  },

  async getDashboardStats(traderId: string) {
    const now = new Date()
    const todayStart = getStartOfTodayInLagos(now)
    const weekStart = getStartOfWeekInLagos(now)

    const [todayStats, weekStats, totalStats] = await Promise.all([
      prisma.sale.aggregate({
        where: { traderId, soldAt: { gte: todayStart } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { traderId, soldAt: { gte: weekStart } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { traderId },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ])

    return {
      today: {
        total: todayStats._sum.amount ?? new Prisma.Decimal(0),
        count: todayStats._count.id,
      },
      thisWeek: {
        total: weekStats._sum.amount ?? new Prisma.Decimal(0),
        count: weekStats._count.id,
      },
      allTime: {
        total: totalStats._sum.amount ?? new Prisma.Decimal(0),
        count: totalStats._count.id,
      },
    }
  },

  async getTotalsForPeriod(traderId: string, from?: Date, to?: Date) {
    return prisma.sale.aggregate({
      where: {
        traderId,
        ...(from || to
          ? {
              soldAt: {
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
    return prisma.sale.findFirst({
      where: { id, traderId },
      select: saleSelect,
    })
  },

  async delete(id: string, traderId: string) {
    return prisma.sale.deleteMany({ where: { id, traderId } })
  },
}
