import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'

type InternalRole = 'PLATFORM_ADMIN' | 'PLATFORM_DEV'

export const authorizeInternalRole = (...allowedRoles: InternalRole[]) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    const req = _req
    const role = req.internalUser?.role

    if (!role) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }

    if (!allowedRoles.includes(role)) {
      throw new AppError('You are not allowed to perform this action', 403, 'FORBIDDEN')
    }

    next()
  }
}

