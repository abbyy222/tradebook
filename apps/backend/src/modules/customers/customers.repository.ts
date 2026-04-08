import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customers.schema'

const customerSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect

export const customersRepository = {
  async upsert(traderId: string, input: CreateCustomerInput) {
    return prisma.customer.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        traderId,
        name: input.name,
        phoneNumber: input.phoneNumber ?? null,
        note: input.note?.trim() || null,
      },
      update: {
        name: input.name,
        phoneNumber: input.phoneNumber ?? null,
        note: input.note?.trim() || null,
      },
      select: customerSelect,
    })
  },

  async findMany(traderId: string, query: ListCustomersQuery) {
    const { cursor, pageSize, search } = query
    const where: Prisma.CustomerWhereInput = {
      traderId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const raw = await prisma.customer.findMany({
      where,
      select: customerSelect,
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1,
    })

    const hasNextPage = raw.length > pageSize
    const customers = hasNextPage ? raw.slice(0, pageSize) : raw
    const nextCursor = hasNextPage && customers.length > 0 ? customers[customers.length - 1].createdAt.toISOString() : null

    return { customers, nextCursor, hasNextPage }
  },

  async findById(id: string, traderId: string) {
    return prisma.customer.findFirst({ where: { id, traderId }, select: customerSelect })
  },

  async update(id: string, traderId: string, input: UpdateCustomerInput) {
    return prisma.customer.updateMany({
      where: { id, traderId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber || null } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      },
    })
  },

  async delete(id: string, traderId: string) {
    return prisma.customer.deleteMany({ where: { id, traderId } })
  },
}
