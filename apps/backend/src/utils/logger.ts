// src/utils/logger.ts
// We use Winston over console.log because in production you need:
// - Log levels (info, warn, error) so you can filter
// - JSON format so log aggregators (Datadog, Logtail) can parse and search
// - Timestamps on every line
// - Request IDs so you can trace one user's journey through many log lines

import winston from 'winston'
import { env } from '../config/env'

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production'
    ? winston.format.json()// machines read this
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, ...meta }) => {
          const renderedMessage =
            typeof message === 'string' ? message : JSON.stringify(message)
          const renderedMeta =
            Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''

          return `${level}: ${renderedMessage}${renderedMeta}`
        })
      ),
  transports: [new winston.transports.Console()],
})
