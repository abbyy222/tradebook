import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import {
  CreateStockItemInput,
  ListStockQuery,
} from './stock.schema'

const stockSelect = {
  id: true,
  itemName: true,
  quantity: true,
  unitPrice: true,
  costPrice: true,
  lowStockThreshold: true,
  syncStatus: true,
  updatedAt: true,
  createdAt: true,
} satisfies Prisma.StockItemSelect

export const stockRepository = {
  async upsert(traderId: string, data: CreateStockItemInput) {
    return prisma.stockItem.upsert({
      where: {
        traderId_itemName: { traderId, itemName: data.itemName },
      },
      create: {
        id: data.id,
        traderId,
        itemName: data.itemName,
        quantity: data.quantity,
        unitPrice: new Prisma.Decimal(data.unitPrice),
        costPrice: new Prisma.Decimal(data.costPrice),
        lowStockThreshold: data.lowStockThreshold,
        syncStatus: 'SYNCED',
      },
      update: {
        quantity: data.quantity,
        unitPrice: new Prisma.Decimal(data.unitPrice),
        costPrice: new Prisma.Decimal(data.costPrice),
        lowStockThreshold: data.lowStockThreshold,
        syncStatus: 'SYNCED',
      },
      select: stockSelect,
    })
  },

  async bulkUpsert(traderId: string, items: CreateStockItemInput[]) {
    return prisma.$transaction(
      items.map(item =>
        prisma.stockItem.upsert({
          where: {
            traderId_itemName: { traderId, itemName: item.itemName },
          },
          create: {
            id: item.id,
            traderId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            costPrice: new Prisma.Decimal(item.costPrice),
            lowStockThreshold: item.lowStockThreshold,
            syncStatus: 'SYNCED',
          },
          update: {
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            costPrice: new Prisma.Decimal(item.costPrice),
            lowStockThreshold: item.lowStockThreshold,
            syncStatus: 'SYNCED',
          },
          select: stockSelect,
        })
      )
    )
  },

  async adjustQuantity(id: string, traderId: string, delta: number) {
    const item = await prisma.stockItem.findFirst({
      where: { id, traderId },
      select: { id: true, quantity: true, lowStockThreshold: true },
    })

    if (!item) return null

    if (delta < 0 && item.quantity + delta < 0) {
      throw new Error(`Insufficient stock. Current: ${item.quantity}, Requested: ${Math.abs(delta)}`)
    }

    return prisma.stockItem.update({
      where: { id },
      data: {
        quantity: { increment: delta },
        syncStatus: 'SYNCED',
      },
      select: stockSelect,
    })
  },

  async findMany(traderId: string, query: ListStockQuery) {
    const { cursor, pageSize, lowStockOnly, search } = query

    const where: Prisma.StockItemWhereInput = {
      traderId,
      ...(cursor && { updatedAt: { lt: new Date(cursor) } }),
      ...(lowStockOnly && {
        quantity: {
          lte: prisma.stockItem.fields.lowStockThreshold as any,
        },
      }),
      ...(search && {
        itemName: { contains: search, mode: 'insensitive' },
      }),
    }

    const raw = await prisma.stockItem.findMany({
      where,
      select: stockSelect,
      orderBy: { updatedAt: 'desc' },
      take: pageSize + 1,
    })

    const hasNextPage = raw.length > pageSize
    const items = hasNextPage ? raw.slice(0, pageSize) : raw
    const nextCursor = hasNextPage && items.length > 0
      ? items[items.length - 1].updatedAt.toISOString()
      : null

    return { items, nextCursor, hasNextPage }
  },

  async getLowStockItems(traderId: string) {
    return prisma.$queryRaw<
      Array<{ id: string; itemName: string; quantity: number; lowStockThreshold: number; unitPrice: Prisma.Decimal; costPrice: Prisma.Decimal }>
    >`
      SELECT id, item_name as "itemName", quantity, low_stock_threshold as "lowStockThreshold", unit_price as "unitPrice", cost_price as "costPrice"
      FROM stock_items
      WHERE trader_id = ${traderId}
        AND quantity <= low_stock_threshold
      ORDER BY quantity ASC
      LIMIT 20
    `
  },

  async getInventorySummary(traderId: string) {
    const [summary] = await prisma.$queryRaw<
      Array<{
        inventoryValue: Prisma.Decimal | null
        retailValue: Prisma.Decimal | null
        expectedMarginOnHand: Prisma.Decimal | null
        unitsOnHand: bigint | number | null
      }>
    >`
      SELECT
        COALESCE(SUM(quantity * cost_price), 0) as "inventoryValue",
        COALESCE(SUM(quantity * unit_price), 0) as "retailValue",
        COALESCE(SUM(quantity * (unit_price - cost_price)), 0) as "expectedMarginOnHand",
        COALESCE(SUM(quantity), 0) as "unitsOnHand"
      FROM stock_items
      WHERE trader_id = ${traderId}
    `

    return {
      inventoryValue: Number(summary?.inventoryValue ?? 0),
      retailValue: Number(summary?.retailValue ?? 0),
      expectedMarginOnHand: Number(summary?.expectedMarginOnHand ?? 0),
      unitsOnHand: Number(summary?.unitsOnHand ?? 0),
    }
  },

  async findById(id: string, traderId: string) {
    return prisma.stockItem.findFirst({
      where: { id, traderId },
      select: stockSelect,
    })
  },

  async delete(id: string, traderId: string) {
    return prisma.stockItem.deleteMany({ where: { id, traderId } })
  },
}