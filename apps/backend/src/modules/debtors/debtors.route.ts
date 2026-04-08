// src/modules/debtors/debtors.routes.ts

import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  createDebtorSchema,
  recordPaymentSchema,
  listDebtorsQuerySchema,
  updateDebtorScheduleSchema,
} from './debtors.schema'
import { debtorsService } from './debtors.service'

export const debtorsRouter = Router()
debtorsRouter.use(authenticate)

debtorsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createDebtorSchema.parse(req.body)
    const debtor = await debtorsService.createDebtor(req.trader!.traderId, input)
    res.status(201).json({ data: debtor, error: null })
  } catch (err) { next(err) }
})

debtorsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listDebtorsQuerySchema.parse(req.query)
    const result = await debtorsService.listDebtors(req.trader!.traderId, query)
    res.status(200).json(result)
  } catch (err) { next(err) }
})

debtorsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debtorId = Array.isArray(req.params.id)? req.params.id[0]:req.params.id
    const debtor = await debtorsService.getDebtor(debtorId, req.trader!.traderId)
    res.status(200).json({ data: debtor, error: null })
  } catch (err) { next(err) }
})

debtorsRouter.get('/:id/statement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debtorId = Array.isArray(req.params.id)? req.params.id[0]:req.params.id
    const statement = await debtorsService.getStatement(debtorId, req.trader!.traderId)
    res.status(200).json({ data: statement, error: null })
  } catch (err) { next(err) }
})

// GET /api/v1/debtors/:id/payments — full payment history
debtorsRouter.get('/:id/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debtorId = Array.isArray(req.params.id)? req.params.id[0]:req.params.id
    const payments = await debtorsService.getPaymentHistory(
      debtorId,
      req.trader!.traderId
    )
    res.status(200).json({ data: payments, error: null })
  } catch (err) { next(err) }
})

// POST /api/v1/debtors/:id/payments — record a payment
debtorsRouter.post('/:id/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = recordPaymentSchema.parse(req.body)
    const debtorId = Array.isArray(req.params.id)? req.params.id[0]:req.params.id
    const debtor = await debtorsService.recordPayment(
      debtorId,
      req.trader!.traderId,
      input
    )
    res.status(200).json({ data: debtor, error: null })
  } catch (err) { next(err) }
})

debtorsRouter.patch('/:id/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debtorId = Array.isArray(req.params.id)? req.params.id[0]:req.params.id
    const input = updateDebtorScheduleSchema.parse(req.body)
    const debtor = await debtorsService.updateDebtorSchedule(debtorId, req.trader!.traderId, input)
    res.status(200).json({ data: debtor, error: null })
  } catch (err) { next(err) }
})

debtorsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debtorId = Array.isArray(req.params.id)? req.params.id[0]: req.params.id
    const result = await debtorsService.deleteDebtor(debtorId, req.trader!.traderId)
    res.status(200).json({ data: result, error: null })
  } catch (err) { next(err) }
})
