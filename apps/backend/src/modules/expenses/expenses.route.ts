// src/modules/expenses/expenses.routes.ts

import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  createExpenseSchema,
  syncExpensesSchema,
  listExpensesQuerySchema,
} from './expenses.schema'
import { expensesService } from './expenses.service'
import { z } from 'zod'

export const expensesRouter = Router()
expensesRouter.use(authenticate)

expensesRouter.post(
  '/sync',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const traderId = req.trader!.traderId
      const input = createExpenseSchema.parse(req.body)
      const expense = await expensesService.syncExpense(traderId, input)
      res.status(201).json({ data: expense, error: null })
    } catch (err) {
      next(err)
    }
  }
)

expensesRouter.post(
  '/sync/batch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const traderId = req.trader!.traderId
      const input = syncExpensesSchema.parse(req.body)
      const result = await expensesService.syncBatch(traderId, input)
      res.status(200).json({ data: result, error: null })
    } catch (err) {
      next(err)
    }
  }
)

expensesRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const traderId = req.trader!.traderId
      const query = listExpensesQuerySchema.parse(req.query)
      const result = await expensesService.listExpenses(traderId, query)
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
)

// GET /api/v1/expenses/insights?from=...&to=...
// Returns spending broken down by category for the insights screen.
expensesRouter.get(
  '/insights',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const traderId = req.trader!.traderId

      // Parse and validate the date range query params
      const { from, to } = z
        .object({
          from: z.string().datetime(),
          to: z.string().datetime(),
        })
        .parse(req.query)

      const breakdown = await expensesService.getCategoryBreakdown(
        traderId,
        new Date(from),
        new Date(to)
      )
      res.status(200).json({ data: breakdown, error: null })
    } catch (err) {
      next(err)
    }
  }
)

expensesRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expenseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const expense = await expensesService.getExpense(
        expenseId,
        req.trader!.traderId
      )
      res.status(200).json({ data: expense, error: null })
    } catch (err) {
      next(err)
    }
  }
)

expensesRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expenseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const result = await expensesService.deleteExpense(
        expenseId,
        req.trader!.traderId
      )
      res.status(200).json({ data: result, error: null })
    } catch (err) {
      next(err)
    }
  }
)
