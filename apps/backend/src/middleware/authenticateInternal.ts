import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'

interface InternalJwtPayload {
  internalUserId: string
  role: 'PLATFORM_ADMIN' | 'PLATFORM_DEV'
  phoneNumber: string
}

export const authenticateInternal = (_req: Request, _res: Response, next: NextFunction) => {
  const req = _req
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('No internal token provided', 401, 'UNAUTHORIZED')
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, env.INTERNAL_JWT_SECRET) as InternalJwtPayload
    req.internalUser = payload
    next()
  } catch {
    throw new AppError('Invalid or expired internal token', 401, 'UNAUTHORIZED')
  }
}

