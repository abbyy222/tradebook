import { requestMetrics } from '../../observability/requestMetrics'
import { insightsRepository } from '../insights/insights.repository'
import { prisma } from '../../prisma/client'

export const platformDevService = {
  async getConsoleOverview() {
    const reqSummary = requestMetrics.getSummary(60 * 60 * 1000)
    const processMemory = process.memoryUsage()

    let db = { ok: false, latencyMs: null as number | null }
    try {
      const latencyMs = await insightsRepository.pingDatabase()
      db = { ok: true, latencyMs }
    } catch {
      db = { ok: false, latencyMs: null }
    }

    const internalCounts = await prisma.$queryRawUnsafe<Array<{ role: 'PLATFORM_ADMIN' | 'PLATFORM_DEV'; count: number }>>(
      `SELECT role, count(*)::int AS count
       FROM internal_users
       WHERE is_active = true
       GROUP BY role`
    )
    const internalAdmins = internalCounts.find((row) => row.role === 'PLATFORM_ADMIN')?.count ?? 0
    const internalDevelopers = internalCounts.find((row) => row.role === 'PLATFORM_DEV')?.count ?? 0

    return {
      data: {
        uptimeSeconds: Math.floor(process.uptime()),
        requestsLastHour: reqSummary.totalRequests,
        serverErrorsLastHour: reqSummary.errorRequests,
        errorRatePercent: reqSummary.errorRate,
        avgResponseMs: reqSummary.avgDurationMs,
        p95ResponseMs: reqSummary.p95DurationMs,
        topSlowEndpoints: reqSummary.topSlowEndpoints,
        topErrorEndpoints: reqSummary.topErrorEndpoints,
        process: {
          rssMb: Number((processMemory.rss / 1024 / 1024).toFixed(1)),
          heapUsedMb: Number((processMemory.heapUsed / 1024 / 1024).toFixed(1)),
        },
        database: db,
        internalAccess: {
          admins: internalAdmins,
          developers: internalDevelopers,
        },
      },
      error: null,
    }
  },
}
