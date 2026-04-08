import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateSavingsEntryInput, ListSavingsEntriesQuery, UpdateSavingsEntryInput } from './savings.schema'

const savingsSelect = {
  id: true,
  amount: true,
  note: true,
  savedAt: true,
  createdByTraderId: true,
  createdAt: true,
} satisfies Prisma.SavingsEntrySelect

export const savingsRepository = {
  async upsert(traderId: string, actorId: string, input: CreateSavingsEntryInput) {
    return prisma.savingsEntry.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        traderId,
        createdByTraderId: actorId,
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
        savedAt: new Date(input.savedAt),
      },
      update: {
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
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

  async update(id: string, traderId: string, input: UpdateSavingsEntryInput) {
    return prisma.savingsEntry.updateMany({
      where: { id, traderId },
      data: {
        amount: new Prisma.Decimal(input.amount),
        note: input.note?.trim() || null,
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
}
