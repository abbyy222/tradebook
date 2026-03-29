// src/modules/auth/auth.routes.ts
// The route handler is deliberately thin.
// Validate → call service → send response. That's it.
// No business logic here. No database calls here.
// It just translates HTTP into service calls and back.

import { Router, Request, Response, NextFunction } from 'express'
import { registerSchema, loginSchema } from './auth.schema'
import { authService } from './auth.service'

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
