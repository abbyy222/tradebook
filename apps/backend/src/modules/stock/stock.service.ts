import { stockRepository } from './stock.repository'
import {
  CreateStockItemInput,
  AdjustStockInput,
  SyncStockInput,
  ListStockQuery,
} from './stock.schema'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'
import { authRepository } from '../auth/auth.repository'

const toStockDTO = (item: any) => {
  const unitPrice = Number(item.unitPrice)
  const costPrice = Number(item.costPrice)
  const wholesalePrice = item.wholesalePrice == null ? null : Number(item.wholesalePrice)
  const stockValue = item.quantity * costPrice
  const retailValue = item.quantity * unitPrice

  return {
    ...item,
    unitPrice,
    costPrice,
    wholesalePrice,
    stockValue,
    retailValue,
    expectedGrossProfit: retailValue - stockValue,
    isLowStock: item.quantity <= item.lowStockThreshold,
    updatedAt: item.updatedAt.toISOString?.() ?? item.updatedAt,
    createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
  }
}

export const stockService = {
  async syncItem(traderId: string, actorId: string, input: CreateStockItemInput) {
    const actor = await authRepository.findById(actorId)
    const item = await stockRepository.upsert(traderId, input, {
      actorTraderId: actorId,
      actorTraderName: actor?.name ?? 'Unknown staff',
    })
    return toStockDTO(item)
  },

  async syncBatch(traderId: string, actorId: string, input: SyncStockInput) {
    logger.info({ event: 'bulk_sync_stock', traderId, actorId, count: input.items.length })
    const actor = await authRepository.findById(actorId)
    const synced = await stockRepository.bulkUpsert(traderId, input.items, {
      actorTraderId: actorId,
      actorTraderName: actor?.name ?? 'Unknown staff',
    })
    return { synced: synced.length, items: synced.map(toStockDTO) }
  },

  async adjustStock(id: string, traderId: string, actorId: string, input: AdjustStockInput) {
    try {
      const actor = await authRepository.findById(actorId)
      const updated = await stockRepository.adjustQuantity(id, traderId, input, {
        actorTraderId: actorId,
        actorTraderName: actor?.name ?? 'Unknown staff',
      })
      if (!updated) {
        throw new AppError('Stock item not found', 404, 'NOT_FOUND')
      }

      logger.info({
        event: 'stock_adjusted',
        traderId,
        itemId: id,
        delta: input.delta,
        reason: input.reason,
        newQuantity: updated.quantity,
        unitPrice: input.unitPrice,
        costPrice: input.costPrice,
        wholesalePrice: input.wholesalePrice,
        wholesaleMinQty: input.wholesaleMinQty,
        lowStockThreshold: input.lowStockThreshold,
      })

      return toStockDTO(updated)
    } catch (err: any) {
      if (err.message?.includes('Insufficient stock')) {
        throw new AppError(err.message, 400, 'INSUFFICIENT_STOCK')
      }
      throw err
    }
  },

  async listStock(traderId: string, query: ListStockQuery) {
    const result = await stockRepository.findMany(traderId, query)
    return {
      data: result.items.map(toStockDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  async getLowStockAlerts(traderId: string) {
    const items = await stockRepository.getLowStockItems(traderId)
    return items.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      costPrice: Number(item.costPrice),
      wholesalePrice: item.wholesalePrice == null ? null : Number(item.wholesalePrice),
      stockValue: item.quantity * Number(item.costPrice),
      retailValue: item.quantity * Number(item.unitPrice),
      expectedGrossProfit: item.quantity * (Number(item.unitPrice) - Number(item.costPrice)),
      isLowStock: true,
    }))
  },

  async getStockItem(id: string, traderId: string) {
    const item = await stockRepository.findById(id, traderId)
    if (!item) throw new AppError('Stock item not found', 404, 'NOT_FOUND')
    return toStockDTO(item)
  },

  async getStockMovements(id: string, traderId: string) {
    const item = await stockRepository.findById(id, traderId)
    if (!item) throw new AppError('Stock item not found', 404, 'NOT_FOUND')

    const movements = await stockRepository.findMovements(id, traderId)
    return movements.map((movement: any) => ({
      id: movement.id,
      stockItemId: movement.stockItemId,
      itemName: movement.stockItem.itemName,
      type: movement.type,
      quantityDelta: movement.quantityDelta,
      quantityAfter: movement.quantityAfter,
      unitName: movement.unitName,
      actorTraderId: movement.actorTraderId,
      actorTraderName: movement.actorTraderName,
      unitPrice: movement.unitPrice == null ? null : Number(movement.unitPrice),
      costPrice: movement.costPrice == null ? null : Number(movement.costPrice),
      wholesalePrice: movement.wholesalePrice == null ? null : Number(movement.wholesalePrice),
      wholesaleMinQty: movement.wholesaleMinQty,
      note: movement.note,
      referenceId: movement.referenceId,
      happenedAt: movement.happenedAt.toISOString(),
      createdAt: movement.createdAt.toISOString(),
    }))
  },

  async deleteStockItem(id: string, traderId: string) {
    const result = await stockRepository.delete(id, traderId)
    if (result.count === 0) throw new AppError('Stock item not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}
