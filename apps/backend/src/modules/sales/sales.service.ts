import { Prisma } from '@prisma/client'
import { salesRepository } from './sales.repository'
import { debtorsRepository } from '../debtors/debtors.repository'
import { expensesRepository } from '../expenses/expenses.repository'
import { stockRepository } from '../stock/stock.repository'
import { CreateSaleInput, ListSalesQuery, ProfitLossQuery, SyncSalesInput } from './sales.schema'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'

const LAGOS_OFFSET_MS = 60 * 60 * 1000

const toSaleDTO = (sale: any) => ({
  ...sale,
  unitPrice: Number(sale.unitPrice),
  amount: Number(sale.amount),
  soldAt: sale.soldAt.toISOString(),
  createdAt: sale.createdAt.toISOString(),
})

const getPeriodStartInLagos = (period: ProfitLossQuery['period'], now: Date) => {
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)

  switch (period) {
    case 'TODAY':
      lagosNow.setUTCHours(0, 0, 0, 0)
      return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
    case 'THIS_WEEK': {
      const day = lagosNow.getUTCDay()
      const offset = day === 0 ? 6 : day - 1
      lagosNow.setUTCDate(lagosNow.getUTCDate() - offset)
      lagosNow.setUTCHours(0, 0, 0, 0)
      return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
    }
    case 'THIS_MONTH':
      lagosNow.setUTCDate(1)
      lagosNow.setUTCHours(0, 0, 0, 0)
      return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
    case 'THIS_YEAR':
      lagosNow.setUTCMonth(0, 1)
      lagosNow.setUTCHours(0, 0, 0, 0)
      return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
    case 'ALL_TIME':
    default:
      return undefined
  }
}

const getPeriodEndInLagos = (period: ProfitLossQuery['period'], now: Date) => {
  if (period === 'ALL_TIME') return now

  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  lagosNow.setUTCHours(23, 59, 59, 999)
  return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
}

const assertSaleAmountMatches = (input: CreateSaleInput) => {
  const expected = Number((input.quantity * input.unitPrice).toFixed(2))
  if (Math.abs(expected - input.amount) > 0.009) {
    throw new AppError('Sale amount does not match quantity multiplied by the selling price', 400, 'INVALID_SALE_AMOUNT')
  }
}

const normalizeSaleAgainstStock = async (traderId: string, input: CreateSaleInput, existingSale: Awaited<ReturnType<typeof salesRepository.findById>>) => {
  assertSaleAmountMatches(input)

  if (!input.stockItemId) {
    return input
  }

  const stockItem = await stockRepository.findById(input.stockItemId, traderId)
  if (!stockItem) {
    throw new AppError('Selected stock item was not found', 400, 'STOCK_ITEM_NOT_FOUND')
  }

  const canonicalUnitPrice = Number(stockItem.unitPrice)
  if (Math.abs(canonicalUnitPrice - input.unitPrice) > 0.009) {
    throw new AppError('Use the current selling price saved on the stock item', 400, 'INVALID_SELLING_PRICE')
  }

  if (!existingSale && stockItem.quantity < input.quantity) {
    throw new AppError(
      'Not enough stock. Available: ' + stockItem.quantity + ', requested: ' + input.quantity,
      400,
      'INSUFFICIENT_STOCK'
    )
  }

  return {
    ...input,
    itemName: stockItem.itemName,
    unitPrice: canonicalUnitPrice,
    amount: Number((input.quantity * canonicalUnitPrice).toFixed(2)),
  }
}

export const salesService = {
  async syncSale(traderId: string, input: CreateSaleInput) {
    const existingSale = await salesRepository.findById(input.id, traderId)
    const normalizedInput = await normalizeSaleAgainstStock(traderId, input, existingSale)

    if (existingSale) {
      return toSaleDTO(existingSale)
    }

    if (normalizedInput.paymentType === 'DEBT' && !normalizedInput.debtorId) {
      throw new AppError('A debtor must be specified for credit sales', 400, 'DEBTOR_REQUIRED')
    }

    if (normalizedInput.debtorId) {
      const debtor = await debtorsRepository.findById(normalizedInput.debtorId, traderId)
      if (!debtor) {
        throw new AppError('Debtor not found', 404, 'NOT_FOUND')
      }
    }

    let sale
    try {
      sale = await salesRepository.create(traderId, normalizedInput)
    } catch (error) {
      const isDuplicateSale = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      if (!isDuplicateSale) throw error

      const alreadySynced = await salesRepository.findById(normalizedInput.id, traderId)
      if (!alreadySynced) {
        throw new AppError('Sale already exists but could not be loaded', 409, 'SALE_DUPLICATE')
      }
      return toSaleDTO(alreadySynced)
    }

    if (normalizedInput.stockItemId) {
      await stockRepository.adjustQuantity(normalizedInput.stockItemId, traderId, {
        delta: -normalizedInput.quantity,
        reason: 'sale_adjustment',
      })
    }

    if (normalizedInput.paymentType === 'DEBT' && normalizedInput.debtorId) {
      await debtorsRepository.incrementOwed(normalizedInput.debtorId, normalizedInput.amount)
    }

    return toSaleDTO(sale)
  },

  async syncBatch(traderId: string, input: SyncSalesInput) {
    logger.info({ event: 'bulk_sync', traderId, count: input.sales.length })

    const sales = []
    for (const sale of input.sales) {
      sales.push(await this.syncSale(traderId, sale))
    }

    return {
      synced: sales.length,
      sales,
    }
  },

  async listSales(traderId: string, query: ListSalesQuery) {
    const result = await salesRepository.findMany(traderId, query)
    return {
      data: result.sales.map(toSaleDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  async getDashboardStats(traderId: string) {
    const stats = await salesRepository.getDashboardStats(traderId)
    return {
      today: { total: Number(stats.today.total), count: stats.today.count },
      thisWeek: { total: Number(stats.thisWeek.total), count: stats.thisWeek.count },
      allTime: { total: Number(stats.allTime.total), count: stats.allTime.count },
    }
  },

  async getProfitLossSummary(traderId: string, query: ProfitLossQuery) {
    const now = new Date()
    const from = getPeriodStartInLagos(query.period, now)
    const to = getPeriodEndInLagos(query.period, now)

    const [salesTotals, expenseTotals, inventorySummary, receivablesSummary] = await Promise.all([
      salesRepository.getTotalsForPeriod(traderId, from, to),
      expensesRepository.getTotalForPeriod(traderId, from, to),
      stockRepository.getInventorySummary(traderId),
      debtorsRepository.getReceivablesSummary(traderId),
    ])

    const revenue = Number(salesTotals._sum.amount ?? 0)
    const expenseTotal = Number(expenseTotals._sum.amount ?? 0)

    return {
      period: query.period,
      revenue,
      expenseTotal,
      operatingProfit: revenue - expenseTotal,
      inventoryValue: inventorySummary.inventoryValue,
      retailValue: inventorySummary.retailValue,
      expectedMarginOnHand: inventorySummary.expectedMarginOnHand,
      receivablesTotal: receivablesSummary.receivablesTotal,
      salesCount: salesTotals._count.id,
      expenseCount: expenseTotals._count.id,
      unitsOnHand: inventorySummary.unitsOnHand,
      activeDebtorsCount: receivablesSummary.activeDebtorsCount,
    }
  },

  async getSale(id: string, traderId: string) {
    const sale = await salesRepository.findById(id, traderId)
    if (!sale) {
      throw new AppError('Sale not found', 404, 'NOT_FOUND')
    }
    return toSaleDTO(sale)
  },

  async deleteSale(id: string, traderId: string) {
    const result = await salesRepository.delete(id, traderId)
    if (result.count === 0) {
      throw new AppError('Sale not found', 404, 'NOT_FOUND')
    }
    return { deleted: true }
  },
}
