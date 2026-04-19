// src/middleware/requestLogger.ts
// Attaches a unique requestId to every request.
// When something goes wrong in production, you can search logs
// by requestId and see the exact journey of that one bad request.

import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { requestMetrics } from '../observability/requestMetrics'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4()
  const start = Date.now()

  // Attach to request so route handlers can log with the same ID
  req.requestId = requestId

  res.on('finish', () => {
    const duration = Date.now() - start
    requestMetrics.record({
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      at: Date.now(),
    })

    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    })
  })

  next()
}
