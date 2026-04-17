// src/server.ts
// Kept deliberately thin. Its only job is to start the HTTP server.
// All app logic lives in app.ts.

import { app } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { seedInternalDeveloper } from './bootstrap/seedInternalDeveloper'

let server: ReturnType<typeof app.listen>

const start = async () => {
  try {
    await seedInternalDeveloper()
  } catch (error) {
    logger.error({
      event: 'platform_dev_seed_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  server = app.listen(Number(env.PORT), () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`)
  })
}

void start()

// Graceful shutdown — when Railway/Vercel stops the container,
// it sends SIGTERM. We finish in-flight requests before closing.
// Without this, active requests get killed mid-response.
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  if (!server) {
    process.exit(0)
  }

  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})
