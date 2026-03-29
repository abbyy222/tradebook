// src/modules/debtors/debtors.service.ts

import { debtorsRepository } from './debtors.repository'
import {
  CreateDebtorInput,
  RecordPaymentInput,
  ListDebtorsQuery,
} from './debtors.schema'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'

const toDebtorDTO = (debtor: any) => ({
  ...debtor,
  totalOwed: Number(debtor.totalOwed),
  totalPaid: Number(debtor.totalPaid),
  // balance is computed on the fly — always accurate,
  // never out of sync with totalOwed and totalPaid
  balance: Number(debtor.totalOwed) - Number(debtor.totalPaid),
  dueDate: debtor.dueDate?.toISOString() ?? null,
  createdAt: debtor.createdAt.toISOString(),
  updatedAt: debtor.updatedAt.toISOString(),
})

export const debtorsService = {

  async createDebtor(traderId: string, input: CreateDebtorInput) {
    const debtor = await debtorsRepository.upsert(traderId, input)
    return toDebtorDTO(debtor)
  },

  async recordPayment(
    debtorId: string,
    traderId: string,
    input: RecordPaymentInput
  ) {
    try {
      const updatedDebtor = await debtorsRepository.recordPayment(
        debtorId,
        traderId,
        input
      )

      // Log every payment for audit trail
      logger.info({
        event: 'payment_recorded',
        traderId,
        debtorId,
        amount: input.amount,
        newStatus: updatedDebtor.status,
      })

      return toDebtorDTO(updatedDebtor)
    } catch (err: any) {
      // Parse the errors thrown inside the transaction
      // and convert them to proper AppErrors with HTTP codes
      if (err.message === 'DEBTOR_NOT_FOUND') {
        throw new AppError('Debtor not found', 404, 'NOT_FOUND')
      }
      if (err.message?.startsWith('OVERPAYMENT:')) {
        const remaining = err.message.split(':')[1]
        throw new AppError(
          `Payment exceeds remaining balance of ₦${Number(remaining).toLocaleString()}`,
          400,
          'OVERPAYMENT'
        )
      }
      throw err
    }
  },

  async listDebtors(traderId: string, query: ListDebtorsQuery) {
    const result = await debtorsRepository.findMany(traderId, query)
    return {
      data: result.debtors.map(toDebtorDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  async getPaymentHistory(debtorId: string, traderId: string) {
    const payments = await debtorsRepository.getPaymentHistory(debtorId, traderId)
    if (!payments) throw new AppError('Debtor not found', 404, 'NOT_FOUND')
    return payments.map(p => ({
      ...p,
      amount: Number(p.amount),
      paidAt: p.paidAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    }))
  },

  async getDebtor(id: string, traderId: string) {
    const debtor = await debtorsRepository.findById(id, traderId)
    if (!debtor) throw new AppError('Debtor not found', 404, 'NOT_FOUND')
    return toDebtorDTO(debtor)
  },

  async deleteDebtor(id: string, traderId: string) {
    const result = await debtorsRepository.delete(id, traderId)
    if (result.count === 0)
      throw new AppError('Debtor not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}