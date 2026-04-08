import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { CreateSupplierInput, ListSuppliersQuery, UpdateSupplierInput } from './suppliers.schema'

const supplierSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  itemCategory: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect

export const suppliersRepository = {
  async upsert(traderId: string, input: CreateSupplierInput) {
    return prisma.supplier.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        traderId,
        name: input.name,
        phoneNumber: input.phoneNumber ?? null,
        itemCategory: input.itemCategory?.trim() || null,
        note: input.note?.trim() || null,
      },
      update: {
        name: input.name,
        phoneNumber: input.phoneNumber ?? null,
        itemCategory: input.itemCategory?.trim() || null,
        note: input.note?.trim() || null,
      },
      select: supplierSelect,
    })
  },

  async findMany(traderId: string, query: ListSuppliersQuery) {
    const { cursor, pageSize, search } = query
    const where: Prisma.SupplierWhereInput = {
      traderId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search, mode: 'insensitive' } },
              { itemCategory: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const raw = await prisma.supplier.findMany({
      where,
      select: supplierSelect,
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1,
    })

    const hasNextPage = raw.length > pageSize
    const suppliers = hasNextPage ? raw.slice(0, pageSize) : raw
    const nextCursor = hasNextPage && suppliers.length > 0 ? suppliers[suppliers.length - 1].createdAt.toISOString() : null

    return { suppliers, nextCursor, hasNextPage }
  },

  async findById(id: string, traderId: string) {
    return prisma.supplier.findFirst({ where: { id, traderId }, select: supplierSelect })
  },

  async update(id: string, traderId: string, input: UpdateSupplierInput) {
    return prisma.supplier.updateMany({
      where: { id, traderId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber || null } : {}),
        ...(input.itemCategory !== undefined ? { itemCategory: input.itemCategory?.trim() || null } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      },
    })
  },

  async delete(id: string, traderId: string) {
    return prisma.supplier.deleteMany({ where: { id, traderId } })
  },
}
