import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'

export const dayCloseRepository = {
  async findByDayKey(traderId: string, dayKey: string) {
    return prisma.dayClose.findUnique({
      where: {
        traderId_dayKey: {
          traderId,
          dayKey,
        },
      },
    })
  },

  async upsertForDay(
    traderId: string,
    dayKey: string,
    input: {
      fromAt: Date
      toAt: Date
      salesTotal: number
      salesCount: number
      cashSalesTotal: number
      transferSalesTotal: number
      debtSalesTotal: number
      expensesTotal: number
      expensesCount: number
      collectionsTotal: number
      collectionsCount: number
      savingsTotal: number
      savingsCount: number
      reconciledSavingsCount: number
      verifiedSavingsCount: number
      operatingBalance: number
      eligibleSalesAfterExpenses: number
      stillAvailableToSave: number
      note?: string | null
      closedByTraderId: string
      closedByTraderName?: string | null
    },
  ) {
    return prisma.dayClose.upsert({
      where: {
        traderId_dayKey: {
          traderId,
          dayKey,
        },
      },
      create: {
        traderId,
        dayKey,
        fromAt: input.fromAt,
        toAt: input.toAt,
        salesTotal: new Prisma.Decimal(input.salesTotal),
        salesCount: input.salesCount,
        cashSalesTotal: new Prisma.Decimal(input.cashSalesTotal),
        transferSalesTotal: new Prisma.Decimal(input.transferSalesTotal),
        debtSalesTotal: new Prisma.Decimal(input.debtSalesTotal),
        expensesTotal: new Prisma.Decimal(input.expensesTotal),
        expensesCount: input.expensesCount,
        collectionsTotal: new Prisma.Decimal(input.collectionsTotal),
        collectionsCount: input.collectionsCount,
        savingsTotal: new Prisma.Decimal(input.savingsTotal),
        savingsCount: input.savingsCount,
        reconciledSavingsCount: input.reconciledSavingsCount,
        verifiedSavingsCount: input.verifiedSavingsCount,
        operatingBalance: new Prisma.Decimal(input.operatingBalance),
        eligibleSalesAfterExpenses: new Prisma.Decimal(input.eligibleSalesAfterExpenses),
        stillAvailableToSave: new Prisma.Decimal(input.stillAvailableToSave),
        note: input.note?.trim() || null,
        closedByTraderId: input.closedByTraderId,
        closedByTraderName: input.closedByTraderName?.trim() || null,
        closedAt: new Date(),
      },
      update: {
        fromAt: input.fromAt,
        toAt: input.toAt,
        salesTotal: new Prisma.Decimal(input.salesTotal),
        salesCount: input.salesCount,
        cashSalesTotal: new Prisma.Decimal(input.cashSalesTotal),
        transferSalesTotal: new Prisma.Decimal(input.transferSalesTotal),
        debtSalesTotal: new Prisma.Decimal(input.debtSalesTotal),
        expensesTotal: new Prisma.Decimal(input.expensesTotal),
        expensesCount: input.expensesCount,
        collectionsTotal: new Prisma.Decimal(input.collectionsTotal),
        collectionsCount: input.collectionsCount,
        savingsTotal: new Prisma.Decimal(input.savingsTotal),
        savingsCount: input.savingsCount,
        reconciledSavingsCount: input.reconciledSavingsCount,
        verifiedSavingsCount: input.verifiedSavingsCount,
        operatingBalance: new Prisma.Decimal(input.operatingBalance),
        eligibleSalesAfterExpenses: new Prisma.Decimal(input.eligibleSalesAfterExpenses),
        stillAvailableToSave: new Prisma.Decimal(input.stillAvailableToSave),
        note: input.note?.trim() || null,
        closedByTraderId: input.closedByTraderId,
        closedByTraderName: input.closedByTraderName?.trim() || null,
        closedAt: new Date(),
      },
    })
  },
}
