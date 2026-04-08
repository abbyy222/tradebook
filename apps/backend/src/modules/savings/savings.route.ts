import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  createSavingsEntrySchema,
  listSavingsEntriesQuerySchema,
  updateSavingsEntrySchema,
} from './savings.schema'
import { savingsService } from './savings.service'

export const savingsRouter = Router()
savingsRouter.use(authenticate)

savingsRouter.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
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

savingsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = updateSavingsEntrySchema.parse(req.body)
    const result = await savingsService.update(id, req.trader!.traderId, req.trader!.role, input)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

savingsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await savingsService.remove(id, req.trader!.traderId, req.trader!.role)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})
