import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'

type Role = 'OWNER' | 'SALESPERSON'

export const authorizeRole = (...allowedRoles: Role[]) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    const req = _req
    const role = req.trader?.role

    if (!role) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    }

    if (!allowedRoles.includes(role)) {
      throw new AppError('You are not allowed to perform this action', 403, 'FORBIDDEN')
    }

    next()
  }
}

