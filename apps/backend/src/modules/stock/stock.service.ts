import { stockRepository } from './stock.repository'
import {
  CreateStockItemInput,
  AdjustStockInput,
  SyncStockInput,
  ListStockQuery,
} from './stock.schema'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'

const toStockDTO = (item: any) => {
  const unitPrice = Number(item.unitPrice)
  const costPrice = Number(item.costPrice)
  const stockValue = item.quantity * costPrice
  const retailValue = item.quantity * unitPrice

  return {
    ...item,
    unitPrice,
    costPrice,
    stockValue,
    retailValue,
    expectedGrossProfit: retailValue - stockValue,
    isLowStock: item.quantity <= item.lowStockThreshold,
    updatedAt: item.updatedAt.toISOString?.() ?? item.updatedAt,
    createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
  }
}

export const stockService = {
  async syncItem(traderId: string, input: CreateStockItemInput) {
    const item = await stockRepository.upsert(traderId, input)
    return toStockDTO(item)
  },

  async syncBatch(traderId: string, input: SyncStockInput) {
    logger.info({ event: 'bulk_sync_stock', traderId, count: input.items.length })
    const synced = await stockRepository.bulkUpsert(traderId, input.items)
    return { synced: synced.length, items: synced.map(toStockDTO) }
  },

  async adjustStock(id: string, traderId: string, input: AdjustStockInput) {
    try {
      const updated = await stockRepository.adjustQuantity(id, traderId, input.delta)
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

  async deleteStockItem(id: string, traderId: string) {
    const result = await stockRepository.delete(id, traderId)
    if (result.count === 0) throw new AppError('Stock item not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}