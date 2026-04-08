import { AppError } from '../../middleware/errorHandler'
import { suppliersRepository } from './suppliers.repository'
import { CreateSupplierInput, ListSuppliersQuery, UpdateSupplierInput } from './suppliers.schema'

const toSupplierDTO = (supplier: any) => ({
  ...supplier,
  createdAt: supplier.createdAt.toISOString(),
  updatedAt: supplier.updatedAt.toISOString(),
})

export const suppliersService = {
  async createOrSync(traderId: string, input: CreateSupplierInput) {
    const supplier = await suppliersRepository.upsert(traderId, input)
    return toSupplierDTO(supplier)
  },

  async list(traderId: string, query: ListSuppliersQuery) {
    const result = await suppliersRepository.findMany(traderId, query)
    return {
      data: result.suppliers.map(toSupplierDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  async getOne(id: string, traderId: string) {
    const supplier = await suppliersRepository.findById(id, traderId)
    if (!supplier) throw new AppError('Supplier not found', 404, 'NOT_FOUND')
    return toSupplierDTO(supplier)
  },

  async update(id: string, traderId: string, input: UpdateSupplierInput) {
    const result = await suppliersRepository.update(id, traderId, input)
    if (result.count === 0) throw new AppError('Supplier not found', 404, 'NOT_FOUND')
    return { updated: true }
  },

  async remove(id: string, traderId: string) {
    const result = await suppliersRepository.delete(id, traderId)
    if (result.count === 0) throw new AppError('Supplier not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}
