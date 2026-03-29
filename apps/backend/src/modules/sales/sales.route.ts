// src/modules/sales/sales.routes.ts
// Deliberately thin. Validate → authenticate → call service → respond.
// Notice every route is wrapped in try/catch with next(err).
// Errors always flow to the global error handler — never handled inline.

import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  createSaleSchema,
  syncSalesSchema,
  listSalesQuerySchema,
} from './sales.schema'
import { salesService } from './sales.service'

export const salesRouter = Router()

// All sales routes require authentication — apply middleware to all
salesRouter.use(authenticate)

// POST /api/v1/sales/sync
// Single sale sync (online mode — sale recorded while connected)
salesRouter.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const input = createSaleSchema.parse(req.body)
    const sale = await salesService.syncSale(traderId, input)

    res.status(201).json({ data: sale, error: null })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/sales/sync/batch
// Bulk sync (offline mode — phone reconnects and flushes queue)
salesRouter.post('/sync/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const input = syncSalesSchema.parse(req.body)
    const result = await salesService.syncBatch(traderId, input)

    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/sales
// Paginated list — cursor-based, filtered, sorted
salesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    // Query params come as strings — Zod transforms them to the right types
    const query = listSalesQuerySchema.parse(req.query)
    const result = await salesService.listSales(traderId, query)

    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/sales/dashboard
// Dashboard stats — today's total, week's total, all time
salesRouter.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = req.trader!.traderId
    const stats = await salesService.getDashboardStats(traderId)

    res.status(200).json({ data: stats, error: null })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/sales/:id
// Single sale detail
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

// DELETE /api/v1/sales/:id
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
