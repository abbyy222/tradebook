import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  confirmSavingsVerificationSchema,
  createSavingsEntrySchema,
  listSavingsEntriesQuerySchema,
  resolveSavingsAccountSchema,
  updateSavingsAccountSchema,
  updateSavingsTargetSchema,
  updateSavingsEntrySchema,
} from './savings.schema'
import { savingsService } from './savings.service'
import { enforceModuleWritable } from '../../middleware/enforceModuleWritable'

export const savingsRouter = Router()

savingsRouter.post('/provider/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providedSecret = req.headers['x-tradebook-payout-secret']
    const expectedSecret = process.env.SAVINGS_PAYOUT_CALLBACK_SECRET

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return res.status(401).json({ data: null, error: { message: 'Invalid callback secret', code: 'INVALID_CALLBACK_SECRET' } })
    }

    const result = await savingsService.handleProviderCallback(req.body)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.post('/paystack/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await savingsService.handlePaystackWebhook(
      req.body,
      req.headers['x-paystack-signature'],
    )
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.use(authenticate)

savingsRouter.post('/sync', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createSavingsEntrySchema.parse(req.body)
    const entry = await savingsService.createOrSync(
      req.trader!.traderId,
      req.trader!.actorId,
      req.trader!.role,
      input
    )
    res.status(201).json({ data: entry, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listSavingsEntriesQuerySchema.parse(req.query)
    const result = await savingsService.list(req.trader!.traderId, query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

savingsRouter.get('/summary/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await savingsService.summaryToday(req.trader!.traderId)
    res.status(200).json({ data: summary, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.get('/target', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = await savingsService.getTargetProgress(req.trader!.traderId)
    res.status(200).json({ data: target, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.get('/account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await savingsService.getSavingsAccount(req.trader!.traderId)
    res.status(200).json({ data: account, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.get('/banks', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banks = await savingsService.listBanks()
    res.status(200).json({ data: banks, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.post('/account/resolve', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = resolveSavingsAccountSchema.parse(req.body)
    const result = await savingsService.resolveSavingsAccount(input)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.patch('/account', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateSavingsAccountSchema.parse(req.body)
    const account = await savingsService.updateSavingsAccount(req.trader!.traderId, req.trader!.role, input)
    res.status(200).json({ data: account, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.post('/:id/verify', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const preview = await savingsService.getVerificationPreview(id, req.trader!.traderId, req.trader!.role)
    res.status(200).json({ data: preview, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.post('/:id/verify/initiate', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await savingsService.initiateVerification(id, req.trader!.traderId, req.trader!.role)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.post('/:id/verify/confirm', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = confirmSavingsVerificationSchema.parse(req.body)
    const result = await savingsService.confirmCheckoutVerification(id, req.trader!.traderId, req.trader!.role, input)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.patch('/target', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateSavingsTargetSchema.parse(req.body)
    const target = await savingsService.updateTarget(req.trader!.traderId, req.trader!.role, input)
    res.status(200).json({ data: target, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.patch('/:id', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = updateSavingsEntrySchema.parse(req.body)
    const result = await savingsService.update(id, req.trader!.traderId, req.trader!.role, input)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.delete('/:id', enforceModuleWritable('SAVINGS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await savingsService.remove(id, req.trader!.traderId, req.trader!.role)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})
