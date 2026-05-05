import { Prisma } from '@prisma/client'
import { salesRepository } from './sales.repository'
import { dayCloseRepository } from './dayClose.repository'
import { debtorsRepository } from '../debtors/debtors.repository'
import { expensesRepository } from '../expenses/expenses.repository'
import { savingsRepository } from '../savings/savings.repository'
import { stockRepository } from '../stock/stock.repository'
import { authRepository } from '../auth/auth.repository'
import { CloseDayInput, CreateSaleInput, ListSalesQuery, ProfitLossQuery, SyncSalesInput } from './sales.schema'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'

const LAGOS_OFFSET_MS = 60 * 60 * 1000

const toSaleDTO = (sale: any) => ({
  ...sale,
  unitPrice: Number(sale.unitPrice),
  amount: Number(sale.amount),
  pricingMode: sale.pricingMode ?? undefined,
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

const getTodayRangeInLagos = (now: Date) => {
  const from = getPeriodStartInLagos('TODAY', now)
  const to = getPeriodEndInLagos('TODAY', now)
  return { from: from!, to }
}

const toLagosDayKey = (date: Date) => {
  const lagosDate = new Date(date.getTime() + LAGOS_OFFSET_MS)
  return `${lagosDate.getUTCFullYear()}-${String(lagosDate.getUTCMonth() + 1).padStart(2, '0')}-${String(lagosDate.getUTCDate()).padStart(2, '0')}`
}

const toClosureDTO = (
  closure: {
    closedAt: Date
    note: string | null
    closedByTraderId: string
    closedByTraderName: string | null
  } | null,
) => ({
  isClosed: Boolean(closure),
  closedAt: closure?.closedAt?.toISOString() ?? null,
  note: closure?.note ?? null,
  closedByTraderId: closure?.closedByTraderId ?? null,
  closedByTraderName: closure?.closedByTraderName ?? null,
})

const resolveActorSnapshot = async (actorId: string) => {
  const actor = await authRepository.findById(actorId)
  return {
    actorTraderId: actorId,
    actorTraderName: actor?.name ?? 'Unknown staff',
  }
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

  const canonicalRetailPrice = Number(stockItem.unitPrice)
  const canonicalWholesalePrice = stockItem.wholesalePrice == null ? null : Number(stockItem.wholesalePrice)

  if (input.pricingMode === 'WHOLESALE' && canonicalWholesalePrice == null) {
    throw new AppError('This stock item does not have a wholesale price yet', 400, 'WHOLESALE_PRICE_NOT_SET')
  }

  if (
    input.pricingMode === 'WHOLESALE' &&
    stockItem.wholesaleMinQty != null &&
    input.quantity < stockItem.wholesaleMinQty
  ) {
    throw new AppError(
      'Wholesale price starts from quantity ' + stockItem.wholesaleMinQty,
      400,
      'WHOLESALE_MIN_QTY_NOT_MET'
    )
  }

  const canonicalUnitPrice = input.pricingMode === 'WHOLESALE'
    ? canonicalWholesalePrice
    : canonicalRetailPrice

  if (canonicalUnitPrice == null || Math.abs(canonicalUnitPrice - input.unitPrice) > 0.009) {
    throw new AppError('Use the current retail or wholesale price saved on the stock item', 400, 'INVALID_SELLING_PRICE')
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
  async syncSale(traderId: string, actorId: string, input: CreateSaleInput) {
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

    const actor = await resolveActorSnapshot(actorId)
    let sale
    try {
      sale = await salesRepository.createWithInventoryEffects(traderId, normalizedInput, actor)
    } catch (error) {
      const isDuplicateSale = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      if (!isDuplicateSale) {
        const message = error instanceof Error ? error.message : ''

        if (message.startsWith('INSUFFICIENT_STOCK:')) {
          const [, available = '0', requested = String(normalizedInput.quantity)] = message.split(':')
          throw new AppError(
            'Stock conflict. Available on server: ' + available + ', requested offline sale: ' + requested,
            409,
            'STOCK_CONFLICT'
          )
        }

        if (message === 'DEBTOR_NOT_FOUND') {
          throw new AppError('Debtor not found', 404, 'NOT_FOUND')
        }

        throw error
      }

      const alreadySynced = await salesRepository.findById(normalizedInput.id, traderId)
      if (!alreadySynced) {
        throw new AppError('Sale already exists but could not be loaded', 409, 'SALE_DUPLICATE')
      }
      return toSaleDTO(alreadySynced)
    }

    return toSaleDTO(sale)
  },

  async syncBatch(traderId: string, actorId: string, input: SyncSalesInput) {
    logger.info({ event: 'bulk_sync', traderId, actorId, count: input.sales.length })

    const sales = []
    for (const sale of input.sales) {
      sales.push(await this.syncSale(traderId, actorId, sale))
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

  async getDayCloseSummary(traderId: string) {
    const now = new Date()
    const { from, to } = getTodayRangeInLagos(now)
    const dayKey = toLagosDayKey(now)

    const [salesTotals, paymentBreakdown, expenseTotals, collectionsSummary, savingsSummary, closure] = await Promise.all([
      salesRepository.getTotalsForPeriod(traderId, from, to),
      salesRepository.getPaymentBreakdownForPeriod(traderId, from, to),
      expensesRepository.getTotalForPeriod(traderId, from, to),
      debtorsRepository.getPaymentsSummaryForPeriod(traderId, from, to),
      savingsRepository.getSummaryForPeriod(traderId, from, to),
      dayCloseRepository.findByDayKey(traderId, dayKey),
    ])

    const breakdownMap = paymentBreakdown.reduce<Record<'CASH' | 'TRANSFER' | 'DEBT', number>>(
      (acc, item) => {
        acc[item.paymentType] = Number(item._sum.amount ?? 0)
        return acc
      },
      { CASH: 0, TRANSFER: 0, DEBT: 0 },
    )

    const salesTotal = Number(salesTotals._sum.amount ?? 0)
    const expenseTotal = Number(expenseTotals._sum.amount ?? 0)
    const eligibleSalesAfterExpenses = Math.max(
      breakdownMap.CASH + breakdownMap.TRANSFER - expenseTotal,
      0,
    )

    return {
      period: {
        label: 'Today',
        from: from.toISOString(),
        to: to.toISOString(),
      },
      sales: {
        total: salesTotal,
        count: salesTotals._count.id,
        cashTotal: breakdownMap.CASH,
        transferTotal: breakdownMap.TRANSFER,
        debtTotal: breakdownMap.DEBT,
      },
      expenses: {
        total: expenseTotal,
        count: expenseTotals._count.id,
      },
      collections: collectionsSummary,
      savings: savingsSummary,
      net: {
        operatingBalance: salesTotal - expenseTotal,
        eligibleSalesAfterExpenses,
        stillAvailableToSave: Math.max(eligibleSalesAfterExpenses - savingsSummary.total, 0),
      },
      closure: toClosureDTO(closure),
    }
  },

  async closeBusinessDay(
    traderId: string,
    actorId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: CloseDayInput,
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can close the business day', 403, 'FORBIDDEN')
    }

    const summary = await this.getDayCloseSummary(traderId)
    const dayKey = toLagosDayKey(new Date(summary.period.from))

    const actor = await resolveActorSnapshot(actorId)

    await dayCloseRepository.upsertForDay(traderId, dayKey, {
      fromAt: new Date(summary.period.from),
      toAt: new Date(summary.period.to),
      salesTotal: summary.sales.total,
      salesCount: summary.sales.count,
      cashSalesTotal: summary.sales.cashTotal,
      transferSalesTotal: summary.sales.transferTotal,
      debtSalesTotal: summary.sales.debtTotal,
      expensesTotal: summary.expenses.total,
      expensesCount: summary.expenses.count,
      collectionsTotal: summary.collections.total,
      collectionsCount: summary.collections.count,
      savingsTotal: summary.savings.total,
      savingsCount: summary.savings.count,
      reconciledSavingsCount: summary.savings.reconciledCount,
      verifiedSavingsCount: summary.savings.verifiedCount,
      operatingBalance: summary.net.operatingBalance,
      eligibleSalesAfterExpenses: summary.net.eligibleSalesAfterExpenses,
      stillAvailableToSave: summary.net.stillAvailableToSave,
      note: input.note,
      closedByTraderId: actorId,
      closedByTraderName: actor.actorTraderName,
    })

    return this.getDayCloseSummary(traderId)
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
