import { AppError } from '../../middleware/errorHandler'
import { customersRepository } from './customers.repository'
import { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customers.schema'

const toCustomerDTO = (customer: any) => ({
  ...customer,
  createdAt: customer.createdAt.toISOString(),
  updatedAt: customer.updatedAt.toISOString(),
})

export const customersService = {
  async createOrSync(traderId: string, input: CreateCustomerInput) {
    const customer = await customersRepository.upsert(traderId, input)
    return toCustomerDTO(customer)
  },

  async list(traderId: string, query: ListCustomersQuery) {
    const result = await customersRepository.findMany(traderId, query)
    return {
      data: result.customers.map(toCustomerDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  async getOne(id: string, traderId: string) {
    const customer = await customersRepository.findById(id, traderId)
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND')
    return toCustomerDTO(customer)
  },

  async update(id: string, traderId: string, input: UpdateCustomerInput) {
    const result = await customersRepository.update(id, traderId, input)
    if (result.count === 0) throw new AppError('Customer not found', 404, 'NOT_FOUND')
    return { updated: true }
  },

  async remove(id: string, traderId: string) {
    const result = await customersRepository.delete(id, traderId)
    if (result.count === 0) throw new AppError('Customer not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}
