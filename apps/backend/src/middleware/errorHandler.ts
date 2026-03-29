// src/middleware/errorHandler.ts
// ONE place where all errors land. Route handlers never send error
// responses themselves — they just throw, and this catches everything.
// This is the global error boundary for the entire API.

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../utils/logger'

// Custom error class so we can attach HTTP status codes to errors
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
  // Zod validation error — bad input from client
  if (err instanceof ZodError) {
    return res.status(400).json({
      data: null,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.flatten().fieldErrors,
      },
    })
  }

  // Our own known errors (not found, unauthorized, etc.)
  if (err instanceof AppError) {
    logger.warn({ requestId: req.requestId, error: err.message, code: err.code })
    return res.status(err.statusCode).json({
      data: null,
      error: { message: err.message, code: err.code },
    })
  }

  // Unknown error — something we didn't anticipate
  // Log the full stack trace, but DON'T send it to the client
  // (stack traces leak implementation details to attackers)
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