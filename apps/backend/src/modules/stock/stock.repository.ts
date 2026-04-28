import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import {
  CreateStockItemInput,
  ListStockQuery,
  AdjustStockInput,
} from './stock.schema'

const stockSelect = {
  id: true,
  itemName: true,
  quantity: true,
  unitPrice: true,
  costPrice: true,
  wholesalePrice: true,
  wholesaleMinQty: true,
  lowStockThreshold: true,
  syncStatus: true,
  updatedAt: true,
  createdAt: true,
} satisfies Prisma.StockItemSelect

const movementSelect = {
  id: true,
  stockItemId: true,
  type: true,
  quantityDelta: true,
  quantityAfter: true,
  unitPrice: true,
  costPrice: true,
  wholesalePrice: true,
  wholesaleMinQty: true,
  note: true,
  referenceId: true,
  happenedAt: true,
  createdAt: true,
  stockItem: {
    select: {
      itemName: true,
    },
  },
} as const

export const stockRepository = {
  async upsert(traderId: string, data: CreateStockItemInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.stockItem.findUnique({
        where: {
          traderId_itemName: { traderId, itemName: data.itemName },
        },
        select: { id: true },
      })

      const item = await tx.stockItem.upsert({
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
          wholesalePrice: data.wholesalePrice != null ? new Prisma.Decimal(data.wholesalePrice) : null,
          wholesaleMinQty: data.wholesaleMinQty ?? null,
          lowStockThreshold: data.lowStockThreshold,
          syncStatus: 'SYNCED',
        },
        update: {
          quantity: data.quantity,
          unitPrice: new Prisma.Decimal(data.unitPrice),
          costPrice: new Prisma.Decimal(data.costPrice),
          wholesalePrice: data.wholesalePrice != null ? new Prisma.Decimal(data.wholesalePrice) : null,
          wholesaleMinQty: data.wholesaleMinQty ?? null,
          lowStockThreshold: data.lowStockThreshold,
          syncStatus: 'SYNCED',
        },
        select: stockSelect,
      })

      if (!existing) {
        await (tx as any).stockMovement.create({
          data: {
            traderId,
            stockItemId: item.id,
            type: 'INITIAL',
            quantityDelta: data.quantity,
            quantityAfter: data.quantity,
            unitPrice: new Prisma.Decimal(data.unitPrice),
            costPrice: new Prisma.Decimal(data.costPrice),
            wholesalePrice: data.wholesalePrice != null ? new Prisma.Decimal(data.wholesalePrice) : null,
            wholesaleMinQty: data.wholesaleMinQty ?? null,
            note: 'Initial stock item created',
            happenedAt: item.createdAt,
          },
        })
      }

      return item
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
            wholesalePrice: item.wholesalePrice != null ? new Prisma.Decimal(item.wholesalePrice) : null,
            wholesaleMinQty: item.wholesaleMinQty ?? null,
            lowStockThreshold: item.lowStockThreshold,
            syncStatus: 'SYNCED',
          },
          update: {
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            costPrice: new Prisma.Decimal(item.costPrice),
            wholesalePrice: item.wholesalePrice != null ? new Prisma.Decimal(item.wholesalePrice) : null,
            wholesaleMinQty: item.wholesaleMinQty ?? null,
            lowStockThreshold: item.lowStockThreshold,
            syncStatus: 'SYNCED',
          },
          select: stockSelect,
        })
      )
    )
  },

  async adjustQuantity(id: string, traderId: string, input: AdjustStockInput) {
    const item = await prisma.stockItem.findFirst({
      where: { id, traderId },
      select: { id: true, quantity: true, lowStockThreshold: true },
    })

    if (!item) return null

    if (input.delta < 0 && item.quantity + input.delta < 0) {
      throw new Error(`Insufficient stock. Current: ${item.quantity}, Requested: ${Math.abs(input.delta)}`)
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.stockItem.update({
        where: { id },
        data: {
          quantity: { increment: input.delta },
          ...(input.unitPrice != null ? { unitPrice: new Prisma.Decimal(input.unitPrice) } : {}),
          ...(input.costPrice != null ? { costPrice: new Prisma.Decimal(input.costPrice) } : {}),
          ...(input.wholesalePrice !== undefined ? { wholesalePrice: input.wholesalePrice != null ? new Prisma.Decimal(input.wholesalePrice) : null } : {}),
          ...(input.wholesaleMinQty !== undefined ? { wholesaleMinQty: input.wholesaleMinQty } : {}),
          ...(input.lowStockThreshold != null ? { lowStockThreshold: input.lowStockThreshold } : {}),
          syncStatus: 'SYNCED',
        },
        select: stockSelect,
      })

      const movementType =
        input.reason === 'restock'
          ? 'RESTOCK'
          : input.reason === 'damage'
            ? 'DAMAGE'
            : 'CORRECTION'

      await (tx as any).stockMovement.create({
        data: {
          traderId,
          stockItemId: updated.id,
          type: movementType,
          quantityDelta: input.delta,
          quantityAfter: updated.quantity,
          unitPrice: input.unitPrice != null ? new Prisma.Decimal(input.unitPrice) : updated.unitPrice,
          costPrice: input.costPrice != null ? new Prisma.Decimal(input.costPrice) : updated.costPrice,
          wholesalePrice:
            input.wholesalePrice !== undefined
              ? input.wholesalePrice != null
                ? new Prisma.Decimal(input.wholesalePrice)
                : null
              : updated.wholesalePrice,
          wholesaleMinQty:
            input.wholesaleMinQty !== undefined ? input.wholesaleMinQty : updated.wholesaleMinQty,
          note: input.delta === 0 ? 'Stock details updated' : input.reason.replace('_', ' '),
          happenedAt: updated.updatedAt,
        },
      })

      return updated
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
      Array<{ id: string; itemName: string; quantity: number; lowStockThreshold: number; unitPrice: Prisma.Decimal; costPrice: Prisma.Decimal; wholesalePrice: Prisma.Decimal | null; wholesaleMinQty: number | null }>
    >`
      SELECT id, item_name as "itemName", quantity, low_stock_threshold as "lowStockThreshold", unit_price as "unitPrice", cost_price as "costPrice", wholesale_price as "wholesalePrice", wholesale_min_qty as "wholesaleMinQty"
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

  async findMovements(stockItemId: string, traderId: string, limit = 40) {
    return (prisma as any).stockMovement.findMany({
      where: { stockItemId, traderId },
      select: movementSelect,
      orderBy: { happenedAt: 'desc' },
      take: limit,
    })
  },
}
