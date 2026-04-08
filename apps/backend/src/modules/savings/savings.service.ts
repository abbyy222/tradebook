import { AppError } from '../../middleware/errorHandler'
import { savingsRepository } from './savings.repository'
import { CreateSavingsEntryInput, ListSavingsEntriesQuery, UpdateSavingsEntryInput } from './savings.schema'

const LAGOS_OFFSET_MS = 60 * 60 * 1000

const toSavingsEntryDTO = (entry: any) => ({
  ...entry,
  amount: Number(entry.amount),
  savedAt: entry.savedAt.toISOString(),
  createdAt: entry.createdAt.toISOString(),
})

const toLagosDayKey = (date: Date) => {
  const lagosDate = new Date(date.getTime() + LAGOS_OFFSET_MS)
  return `${lagosDate.getUTCFullYear()}-${String(lagosDate.getUTCMonth() + 1).padStart(2, '0')}-${String(lagosDate.getUTCDate()).padStart(2, '0')}`
}

const getTodayRangeInLagos = () => {
  const now = new Date()
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  lagosNow.setUTCHours(0, 0, 0, 0)
  const from = new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
  const to = new Date(from.getTime() + (24 * 60 * 60 * 1000) - 1)
  return { from, to }
}

const assertSalespersonCanWriteDate = (role: 'OWNER' | 'SALESPERSON', savedAt: string) => {
  if (role !== 'SALESPERSON') return

  const requested = new Date(savedAt)
  if (Number.isNaN(requested.getTime())) {
    throw new AppError('Invalid savings date', 400, 'BAD_REQUEST')
  }

  const requestedKey = toLagosDayKey(requested)
  const todayKey = toLagosDayKey(new Date())

  if (requestedKey !== todayKey) {
    throw new AppError('Salesperson can only record savings for today', 403, 'FORBIDDEN')
  }
}

export const savingsService = {
  async createOrSync(
    traderId: string,
    actorId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: CreateSavingsEntryInput
  ) {
    assertSalespersonCanWriteDate(role, input.savedAt)
    const entry = await savingsRepository.upsert(traderId, actorId, input)
    return toSavingsEntryDTO(entry)
  },

  async list(traderId: string, query: ListSavingsEntriesQuery) {
    const result = await savingsRepository.findMany(traderId, query)
    return {
      data: result.entries.map(toSavingsEntryDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  async summaryToday(traderId: string) {
    const { from, to } = getTodayRangeInLagos()
    const total = await savingsRepository.getTodayTotal(traderId, from, to)
    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      total,
    }
  },

  async update(
    id: string,
    traderId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: UpdateSavingsEntryInput
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can edit savings records', 403, 'FORBIDDEN')
    }

    const result = await savingsRepository.update(id, traderId, input)
    if (result.count === 0) throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    return { updated: true }
  },

  async remove(id: string, traderId: string, role: 'OWNER' | 'SALESPERSON') {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can delete savings records', 403, 'FORBIDDEN')
    }

    const result = await savingsRepository.delete(id, traderId)
    if (result.count === 0) throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}
