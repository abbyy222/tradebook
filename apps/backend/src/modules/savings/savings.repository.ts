import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateSavingsEntryInput, ListSavingsEntriesQuery, UpdateSavingsEntryInput } from './savings.schema'

const savingsSelect = {
  id: true,
  amount: true,
  note: true,
  status: true,
  reconciledAt: true,
  verifiedAt: true,
  savedAt: true,
  createdByTraderId: true,
  createdAt: true,
} satisfies Prisma.SavingsEntrySelect

export const savingsRepository = {
  async upsert(
    traderId: string,
    actorId: string,
    input: CreateSavingsEntryInput,
    status: 'DECLARED' | 'RECONCILED',
  ) {
    const reconciledAt = status === 'RECONCILED' ? new Date() : null

    return prisma.savingsEntry.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        traderId,
        createdByTraderId: actorId,
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        status,
        reconciledAt,
        verifiedAt: null,
        savedAt: new Date(input.savedAt),
      },
      update: {
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        status,
        reconciledAt,
        verifiedAt: null,
        savedAt: new Date(input.savedAt),
      },
      select: savingsSelect,
    })
  },

  async findMany(traderId: string, query: ListSavingsEntriesQuery) {
    const { cursor, pageSize, from, to } = query

    const where: Prisma.SavingsEntryWhereInput = {
      traderId,
      ...(from || to || cursor
        ? {
            savedAt: {
              ...(cursor ? { lt: new Date(cursor) } : {}),
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }

    const raw = await prisma.savingsEntry.findMany({
      where,
      select: savingsSelect,
      orderBy: { savedAt: 'desc' },
      take: pageSize + 1,
    })

    const hasNextPage = raw.length > pageSize
    const entries = hasNextPage ? raw.slice(0, pageSize) : raw
    const nextCursor = hasNextPage && entries.length > 0
      ? entries[entries.length - 1].savedAt.toISOString()
      : null

    return { entries, nextCursor, hasNextPage }
  },

  async findById(id: string, traderId: string) {
    return prisma.savingsEntry.findFirst({
      where: { id, traderId },
      select: savingsSelect,
    })
  },

  async findBySavedAtRange(traderId: string, from: Date, to: Date) {
    return prisma.savingsEntry.findFirst({
      where: {
        traderId,
        savedAt: { gte: from, lte: to },
      },
      select: savingsSelect,
      orderBy: { savedAt: 'desc' },
    })
  },

  async update(
    id: string,
    traderId: string,
    input: UpdateSavingsEntryInput,
    status: 'DECLARED' | 'RECONCILED',
  ) {
    return prisma.savingsEntry.updateMany({
      where: { id, traderId },
      data: {
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        status,
        reconciledAt: status === 'RECONCILED' ? new Date() : null,
        verifiedAt: null,
        savedAt: new Date(input.savedAt),
      },
    })
  },

  async delete(id: string, traderId: string) {
    return prisma.savingsEntry.deleteMany({ where: { id, traderId } })
  },

  async getTodayTotal(traderId: string, from: Date, to: Date) {
    const result = await prisma.savingsEntry.aggregate({
      where: {
        traderId,
        savedAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    })

    return Number(result._sum.amount ?? 0)
  },

  async getTotalForPeriod(traderId: string, from: Date, to: Date) {
    const result = await prisma.savingsEntry.aggregate({
      where: {
        traderId,
        savedAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    })

    return Number(result._sum.amount ?? 0)
  },

  async getSummaryForPeriod(traderId: string, from: Date, to: Date) {
    const [summary, statusGroups] = await Promise.all([
      prisma.savingsEntry.aggregate({
        where: {
          traderId,
          savedAt: { gte: from, lte: to },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.savingsEntry.groupBy({
        by: ['status'],
        where: {
          traderId,
          savedAt: { gte: from, lte: to },
        },
        _count: { _all: true },
      }),
    ])

    const statusCounts = statusGroups.reduce(
      (acc, item) => {
        acc[item.status as 'DECLARED' | 'RECONCILED' | 'VERIFIED'] = item._count._all
        return acc
      },
      {
        DECLARED: 0,
        RECONCILED: 0,
        VERIFIED: 0,
      } as Record<'DECLARED' | 'RECONCILED' | 'VERIFIED', number>,
    )

    return {
      total: Number(summary._sum.amount ?? 0),
      count: summary._count.id,
      reconciledCount: statusCounts.RECONCILED,
      verifiedCount: statusCounts.VERIFIED,
    }
  },

  async getSavingsTarget(traderId: string) {
    const rows = await prisma.$queryRaw<
      Array<{
        amount: Prisma.Decimal | null
        period: string | null
        updatedAt: Date | null
      }>
    >`
      SELECT
        savings_target_amount as "amount",
        savings_target_period as "period",
        savings_target_updated_at as "updatedAt"
      FROM traders
      WHERE id = ${traderId}
      LIMIT 1
    `

    const row = rows[0]
    if (!row?.amount || !row.period || !row.updatedAt) return null

    return {
      amount: Number(row.amount),
      period: row.period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      updatedAt: row.updatedAt,
    }
  },

  async updateSavingsTarget(
    traderId: string,
    input: { amount: number; period: 'DAILY' | 'WEEKLY' | 'MONTHLY' }
  ) {
    await prisma.$executeRaw`
      UPDATE traders
      SET
        savings_target_amount = ${new Prisma.Decimal(input.amount)},
        savings_target_period = ${input.period},
        savings_target_updated_at = NOW()
      WHERE id = ${traderId}
    `

    return this.getSavingsTarget(traderId)
  },

  async getSavingsAccount(traderId: string) {
    const rows = await prisma.$queryRaw<
      Array<{
        bankName: string | null
        bankCode: string | null
        accountNumber: string | null
        accountName: string | null
        setupAt: Date | null
      }>
    >`
      SELECT
        savings_bank_name as "bankName",
        savings_bank_code as "bankCode",
        savings_account_number as "accountNumber",
        savings_account_name as "accountName",
        savings_account_setup_at as "setupAt"
      FROM traders
      WHERE id = ${traderId}
      LIMIT 1
    `

    const row = rows[0]
    if (!row?.bankName || !row.accountNumber || !row.accountName || !row.setupAt) return null

    return row
  },

  async upsertSavingsAccount(
    traderId: string,
    input: { bankName: string; bankCode: string; accountNumber: string; accountName: string },
  ) {
    await prisma.$executeRaw`
      UPDATE traders
      SET
        savings_bank_name = ${input.bankName.trim()},
        savings_bank_code = ${input.bankCode.trim()},
        savings_account_number = ${input.accountNumber.trim()},
        savings_account_name = ${input.accountName.trim()},
        savings_account_setup_at = COALESCE(savings_account_setup_at, NOW())
      WHERE id = ${traderId}
    `

    return this.getSavingsAccount(traderId)
  },

  async getReconciliationInputs(traderId: string, from: Date, to: Date, excludeSavingsEntryId?: string) {
    const [sales, expenses, savedAlready] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          traderId,
          soldAt: { gte: from, lte: to },
          paymentType: { in: ['CASH', 'TRANSFER'] },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          traderId,
          spentAt: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
      prisma.savingsEntry.aggregate({
        where: {
          traderId,
          savedAt: { gte: from, lte: to },
          ...(excludeSavingsEntryId ? { NOT: { id: excludeSavingsEntryId } } : {}),
        },
        _sum: { amount: true },
      }),
    ])

    return {
      inflowTotal: Number(sales._sum.amount ?? 0),
      expenseTotal: Number(expenses._sum.amount ?? 0),
      savingsAlreadyRecorded: Number(savedAlready._sum.amount ?? 0),
    }
  },

  async markVerificationInitiated(
    id: string,
    traderId: string,
    input: { reference: string; transferId: string | null; status: string },
  ) {
    return prisma.savingsEntry.updateMany({
      where: { id, traderId },
      data: {
        verificationReference: input.reference,
        verificationTransferId: input.transferId,
        verificationLastStatus: input.status,
      },
    })
  },

  async markVerifiedByReference(reference: string, transferId: string | null, status: string) {
    return prisma.savingsEntry.updateMany({
      where: { verificationReference: reference },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verificationTransferId: transferId,
        verificationLastStatus: status,
      },
    })
  },

  async markVerificationStatusByReference(reference: string, transferId: string | null, status: string) {
    return prisma.savingsEntry.updateMany({
      where: { verificationReference: reference },
      data: {
        verificationTransferId: transferId,
        verificationLastStatus: status,
      },
    })
  },
}
