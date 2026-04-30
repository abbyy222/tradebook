import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  createSaleSchema,
  closeDaySchema,
  syncSalesSchema,
  listSalesQuerySchema,
  profitLossQuerySchema,
} from './sales.schema'
import { salesService } from './sales.service'
import { enforceModuleWritable } from '../../middleware/enforceModuleWritable'

export const salesRouter = Router()
salesRouter.use(authenticate)

salesRouter.post('/sync', enforceModuleWritable('SALES'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const input = createSaleSchema.parse(req.body)
    const sale = await salesService.syncSale(traderId, input)

    res.status(201).json({ data: sale, error: null })
  } catch (err) {
    next(err)
  }
})

salesRouter.post('/sync/batch', enforceModuleWritable('SALES'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const input = syncSalesSchema.parse(req.body)
    const result = await salesService.syncBatch(traderId, input)

    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

salesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const query = listSalesQuerySchema.parse(req.query)
    const result = await salesService.listSales(traderId, query)

    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

salesRouter.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const stats = await salesService.getDashboardStats(traderId)

    res.status(200).json({ data: stats, error: null })
  } catch (err) {
    next(err)
  }
})

salesRouter.get('/profit-loss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const query = profitLossQuerySchema.parse(req.query)
    const snapshot = await salesService.getProfitLossSummary(traderId, query)

    res.status(200).json({ data: snapshot, error: null })
  } catch (err) {
    next(err)
  }
})

salesRouter.get('/day-close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const summary = await salesService.getDayCloseSummary(traderId)

    res.status(200).json({ data: summary, error: null })
  } catch (err) {
    next(err)
  }
})

salesRouter.post('/day-close/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const actorId = req.trader!.actorId
    const role = req.trader!.role
    const input = closeDaySchema.parse(req.body)
    const summary = await salesService.closeBusinessDay(traderId, actorId, role, input)

    res.status(200).json({ data: summary, error: null })
  } catch (err) {
    next(err)
  }
})

salesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const saleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const sale = await salesService.getSale(saleId, traderId)

    res.status(200).json({ data: sale, error: null })
  } catch (err) {
    next(err)
  }
})

salesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const saleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await salesService.deleteSale(saleId, traderId)

    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})
