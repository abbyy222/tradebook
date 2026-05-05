// src/modules/auth/auth.routes.ts
// The route handler is deliberately thin.
// Validate → call service → send response. That's it.
// No business logic here. No database calls here.
// It just translates HTTP into service calls and back.

import { Router, Request, Response, NextFunction } from 'express'
import { registerSchema, loginSchema, createSalespersonSchema, updateSalespersonSchema } from './auth.schema'
import { authService } from './auth.service'
import { authenticate } from '../../middleware/authenticate'
import { authorizeRole } from '../../middleware/authorizeRole'

export const authRouter = Router()

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // parse() throws a ZodError if validation fails
    // The global error handler catches it and returns a 400
    const input = registerSchema.parse(req.body)
    const result = await authService.register(input)

    res.status(201).json({ data: result, error: null })
  } catch (err) {
    next(err) // always pass errors to next() — never handle in route
  }
})

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body)
    const result = await authService.login(input)

    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/salespeople', authenticate, authorizeRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createSalespersonSchema.parse(req.body)
    const result = await authService.createSalesperson(req.trader!.traderId, input)

    res.status(201).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/salespeople', authenticate, authorizeRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.listSalespeople(req.trader!.traderId)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

authRouter.patch('/salespeople/:id', authenticate, authorizeRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateSalespersonSchema.parse(req.body)
    const salespersonId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await authService.updateSalesperson(req.trader!.traderId, salespersonId, input)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

authRouter.delete('/salespeople/:id', authenticate, authorizeRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const salespersonId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await authService.deactivateSalesperson(req.trader!.traderId, salespersonId)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', authenticate, async (_req: Request, res: Response) => {
  // JWT is stateless in current architecture, so logout is handled client-side
  // by dropping token/session. This endpoint exists for explicit API semantics.
  res.status(200).json({ data: { success: true }, error: null })
})
