// src/middleware/errorHandler.ts
// ONE place where all errors land. Route handlers never send error
// responses themselves - they just throw, and this catches everything.
// This is the global error boundary for the entire API.

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../utils/logger'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    logger.warn({
      requestId: req.requestId,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      path: req.originalUrl,
      details: err.flatten().fieldErrors,
      issues: err.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
      body: req.body,
    })

    return res.status(400).json({
      data: null,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.flatten().fieldErrors,
      },
    })
  }

  if (err instanceof AppError) {
    logger.warn({ requestId: req.requestId, error: err.message, code: err.code })
    return res.status(err.statusCode).json({
      data: null,
      error: { message: err.message, code: err.code },
    })
  }

  logger.error({
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
  })

  return res.status(500).json({
    data: null,
    error: {
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR',
    },
  })
}
