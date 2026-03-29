// src/middleware/authenticate.ts
// Verifies the JWT on protected routes.
// Route handlers that use this middleware can trust that
// req.trader is always populated — no need to check again inside.

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'

interface JwtPayload {
  traderId: string
  phoneNumber: string
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401, 'UNAUTHORIZED')
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.trader = payload   // attach to request for downstream handlers
    next()
  } catch {
    throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED')
  }
}