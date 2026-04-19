// src/modules/stock/stock.routes.ts

import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorizeRole } from '../../middleware/authorizeRole'
import {
  createStockItemSchema,
  syncStockSchema,
  adjustStockSchema,
  listStockQuerySchema,
} from './stock.schema'
import { stockService } from './stock.service'
import { enforceModuleWritable } from '../../middleware/enforceModuleWritable'

export const stockRouter = Router()
stockRouter.use(authenticate)

stockRouter.post('/sync', authorizeRole('OWNER'), enforceModuleWritable('STOCK'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createStockItemSchema.parse(req.body)
    const item = await stockService.syncItem(req.trader!.traderId, input)
    res.status(201).json({ data: item, error: null })
  } catch (err) { next(err) }
})

stockRouter.post('/sync/batch', authorizeRole('OWNER'), enforceModuleWritable('STOCK'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = syncStockSchema.parse(req.body)
    const result = await stockService.syncBatch(req.trader!.traderId, input)
    res.status(200).json({ data: result, error: null })
  } catch (err) { next(err) }
})

stockRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listStockQuerySchema.parse(req.query)
    const result = await stockService.listStock(req.trader!.traderId, query)
    res.status(200).json(result)
  } catch (err) { next(err) }
})

// GET /api/v1/stock/alerts — low stock items only
stockRouter.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await stockService.getLowStockAlerts(req.trader!.traderId)
    res.status(200).json({ data: alerts, error: null })
  } catch (err) { next(err) }
})

// PATCH /api/v1/stock/:id/adjust — atomic quantity change
stockRouter.patch('/:id/adjust', authorizeRole('OWNER'), enforceModuleWritable('STOCK'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = adjustStockSchema.parse(req.body)
    const stockId = Array.isArray(req.params.id)? req.params.id[0]:req.params.id
    const item = await stockService.adjustStock(
      stockId,
      req.trader!.traderId,
      input
    )
    res.status(200).json({ data: item, error: null })
  } catch (err) { next(err) }
})

stockRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stockId = Array.isArray(req.params.id)? req.params.id[0]:req.params.id
    const item = await stockService.getStockItem(stockId, req.trader!.traderId)
    res.status(200).json({ data: item, error: null })
  } catch (err) { next(err) }
})

stockRouter.delete('/:id', authorizeRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stockId =Array.isArray(req.params.id)?req.params.id[0]:req.params.id
    const result = await stockService.deleteStockItem(stockId, req.trader!.traderId)
    res.status(200).json({ data: result, error: null })
  } catch (err) { next(err) }
})
