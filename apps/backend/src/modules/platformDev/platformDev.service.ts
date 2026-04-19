import { requestMetrics } from '../../observability/requestMetrics'
import { insightsRepository } from '../insights/insights.repository'
import { prisma } from '../../prisma/client'
import {
  DeadLetterQuery,
  ForceResyncInput,
  PlatformDevEventsQuery,
  PlatformModuleKey,
  TenantHeatmapQuery,
} from './platformDev.schema'

const MODULE_KEYS: PlatformModuleKey[] = [
  'SALES',
  'EXPENSES',
  'STOCK',
  'DEBTORS',
  'SAVINGS',
  'SUPPLIERS',
  'CUSTOMERS',
]

const MODULE_TO_TABLE: Partial<Record<PlatformModuleKey, string>> = {
  SALES: 'sales',
  EXPENSES: 'expenses',
  STOCK: 'stock_items',
}

type KillSwitchRow = {
  module_key: PlatformModuleKey
  is_enabled: boolean
  updated_at: Date
}

class PlatformOpsState {
  private ensured = false
  private cache = new Map<PlatformModuleKey, boolean>()
  private cacheExpiresAt = 0

  async ensureSchema() {
    if (this.ensured) return

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS platform_kill_switches (
        module_key TEXT PRIMARY KEY,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_by TEXT
      )
    `)

    for (const key of MODULE_KEYS) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO platform_kill_switches (module_key, is_enabled)
         VALUES ($1, true)
         ON CONFLICT (module_key) DO NOTHING`,
        key
      )
    }

    this.ensured = true
  }

  async refreshCache(force = false) {
    if (!force && Date.now() < this.cacheExpiresAt && this.cache.size > 0) {
      return
    }

    await this.ensureSchema()
    const rows = await prisma.$queryRawUnsafe<KillSwitchRow[]>(
      `SELECT module_key, is_enabled, updated_at FROM platform_kill_switches`
    )

    const next = new Map<PlatformModuleKey, boolean>()
    for (const key of MODULE_KEYS) {
      next.set(key, true)
    }
    for (const row of rows) {
      next.set(row.module_key, row.is_enabled)
    }

    this.cache = next
    this.cacheExpiresAt = Date.now() + 30_000
  }

  async listKillSwitches() {
    await this.refreshCache(true)

    return MODULE_KEYS.map((module) => ({
      module,
      enabled: this.cache.get(module) ?? true,
    }))
  }

  async setKillSwitch(module: PlatformModuleKey, enabled: boolean, updatedBy: string) {
    await this.ensureSchema()

    await prisma.$executeRawUnsafe(
      `INSERT INTO platform_kill_switches (module_key, is_enabled, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (module_key)
       DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      module,
      enabled,
      updatedBy
    )

    await this.refreshCache(true)
  }

  async isModuleEnabled(module: PlatformModuleKey) {
    await this.refreshCache(false)
    return this.cache.get(module) ?? true
  }
}

const platformOpsState = new PlatformOpsState()

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

  async getErrorEvents(query: PlatformDevEventsQuery) {
    const events = requestMetrics.getRecentErrorEvents(
      query.windowMinutes * 60 * 1000,
      query.endpoint,
      query.limit
    )

    return {
      data: {
        events,
        meta: {
          windowMinutes: query.windowMinutes,
          count: events.length,
        },
      },
      error: null,
    }
  },

  async getRequestTraces(query: PlatformDevEventsQuery) {
    const traces = requestMetrics.getRecentRequestTraces(
      query.windowMinutes * 60 * 1000,
      query.endpoint,
      query.limit
    )

    return {
      data: {
        traces,
        meta: {
          windowMinutes: query.windowMinutes,
          count: traces.length,
        },
      },
      error: null,
    }
  },

  async getSyncHealth() {
    const [
      salesPending,
      salesFailed,
      expensesPending,
      expensesFailed,
      stockPending,
      stockFailed,
      recurringDueSoon,
      overdueDebtors,
      topFailedTraders,
    ] = await Promise.all([
      prisma.sale.count({ where: { syncStatus: 'PENDING' } }),
      prisma.sale.count({ where: { syncStatus: 'FAILED' } }),
      prisma.expense.count({ where: { syncStatus: 'PENDING' } }),
      prisma.expense.count({ where: { syncStatus: 'FAILED' } }),
      prisma.stockItem.count({ where: { syncStatus: 'PENDING' } }),
      prisma.stockItem.count({ where: { syncStatus: 'FAILED' } }),
      prisma.expense.count({
        where: {
          expenseType: 'RECURRING',
          nextDueDate: { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.debtor.count({
        where: {
          dueDate: { lt: new Date() },
          status: { in: ['ACTIVE', 'PARTIAL'] },
        },
      }),
      prisma.$queryRawUnsafe<
        Array<{ trader_id: string; business_label: string; failed_records: number }>
      >(
        `WITH failed AS (
          SELECT trader_id, count(*)::int AS failed_records
          FROM (
            SELECT trader_id FROM sales WHERE sync_status = 'FAILED'
            UNION ALL
            SELECT trader_id FROM expenses WHERE sync_status = 'FAILED'
            UNION ALL
            SELECT trader_id FROM stock_items WHERE sync_status = 'FAILED'
          ) x
          GROUP BY trader_id
        )
        SELECT
          f.trader_id,
          COALESCE(t.business_name, t.name) AS business_label,
          f.failed_records
        FROM failed f
        JOIN traders t ON t.id = f.trader_id
        ORDER BY f.failed_records DESC
        LIMIT 8`
      ),
    ])

    const pending = salesPending + expensesPending + stockPending
    const failed = salesFailed + expensesFailed + stockFailed

    return {
      data: {
        totals: {
          pending,
          failed,
          salesPending,
          salesFailed,
          expensesPending,
          expensesFailed,
          stockPending,
          stockFailed,
        },
        operationalRisks: {
          recurringDueSoon,
          overdueDebtors,
        },
        topFailedBusinesses: topFailedTraders.map((row) => ({
          traderId: row.trader_id,
          label: row.business_label,
          failedRecords: Number(row.failed_records ?? 0),
        })),
      },
      error: null,
    }
  },

  async listKillSwitches() {
    const switches = await platformOpsState.listKillSwitches()
    return { data: { switches }, error: null }
  },

  async updateKillSwitch(module: PlatformModuleKey, enabled: boolean, updatedBy: string) {
    await platformOpsState.setKillSwitch(module, enabled, updatedBy)
    const switches = await platformOpsState.listKillSwitches()
    return { data: { switches, updated: { module, enabled } }, error: null }
  },

  async isModuleEnabled(module: PlatformModuleKey) {
    return platformOpsState.isModuleEnabled(module)
  },

  async getDeadLetterQueue(query: DeadLetterQuery) {
    const params: unknown[] = []
    const where: string[] = []

    const canFilterByModule = query.module && ['SALES', 'EXPENSES', 'STOCK'].includes(query.module)
    if (canFilterByModule) {
      params.push(query.module)
      where.push(`entity = $${params.length}`)
    }

    if (query.traderId) {
      params.push(query.traderId)
      where.push(`trader_id = $${params.length}`)
    }

    params.push(query.limit)
    const limitPlaceholder = `$${params.length}`
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    const records = await prisma.$queryRawUnsafe<Array<{
      entity: string
      record_id: string
      trader_id: string
      business_label: string
      amount: number | null
      happened_at: Date
    }>>(
      `SELECT * FROM (
        SELECT 'SALES'::text AS entity, s.id::text AS record_id, s.trader_id,
          COALESCE(t.business_name, t.name) AS business_label,
          s.amount::numeric AS amount,
          s.created_at AS happened_at
        FROM sales s
        JOIN traders t ON t.id = s.trader_id
        WHERE s.sync_status = 'FAILED'

        UNION ALL

        SELECT 'EXPENSES'::text AS entity, e.id::text AS record_id, e.trader_id,
          COALESCE(t.business_name, t.name) AS business_label,
          e.amount::numeric AS amount,
          e.created_at AS happened_at
        FROM expenses e
        JOIN traders t ON t.id = e.trader_id
        WHERE e.sync_status = 'FAILED'

        UNION ALL

        SELECT 'STOCK'::text AS entity, st.id::text AS record_id, st.trader_id,
          COALESCE(t.business_name, t.name) AS business_label,
          NULL::numeric AS amount,
          st.updated_at AS happened_at
        FROM stock_items st
        JOIN traders t ON t.id = st.trader_id
        WHERE st.sync_status = 'FAILED'
      ) dl
      ${whereSql}
      ORDER BY happened_at DESC
      LIMIT ${limitPlaceholder}`,
      ...params
    )

    return {
      data: {
        records: records.map((row) => ({
          module: row.entity as PlatformModuleKey,
          recordId: row.record_id,
          traderId: row.trader_id,
          businessLabel: row.business_label,
          amount: row.amount === null ? null : Number(row.amount),
          happenedAt: row.happened_at.toISOString(),
        })),
        meta: {
          count: records.length,
        },
      },
      error: null,
    }
  },

  async getTenantHeatmap(query: TenantHeatmapQuery) {
    const params: unknown[] = []
    const where: string[] = []

    if (query.search?.trim()) {
      params.push(`%${query.search.trim()}%`)
      const needle = `$${params.length}`
      where.push(`(COALESCE(t.business_name, t.name) ILIKE ${needle} OR t.phone_number ILIKE ${needle})`)
    }

    params.push(query.limit)
    const limitPlaceholder = `$${params.length}`
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const rows = await prisma.$queryRawUnsafe<Array<{
      trader_id: string
      business_label: string
      pending_records: number
      failed_records: number
      overdue_debtors: number
      recurring_due_soon: number
      risk_score: number
    }>>(
      `WITH s AS (
        SELECT trader_id,
          count(*) FILTER (WHERE sync_status = 'PENDING')::int AS pending_sales,
          count(*) FILTER (WHERE sync_status = 'FAILED')::int AS failed_sales
        FROM sales
        GROUP BY trader_id
      ),
      e AS (
        SELECT trader_id,
          count(*) FILTER (WHERE sync_status = 'PENDING')::int AS pending_expenses,
          count(*) FILTER (WHERE sync_status = 'FAILED')::int AS failed_expenses,
          count(*) FILTER (
            WHERE expense_type = 'RECURRING'
              AND next_due_date IS NOT NULL
              AND next_due_date <= NOW() + interval '3 days'
          )::int AS recurring_due_soon
        FROM expenses
        GROUP BY trader_id
      ),
      st AS (
        SELECT trader_id,
          count(*) FILTER (WHERE sync_status = 'PENDING')::int AS pending_stock,
          count(*) FILTER (WHERE sync_status = 'FAILED')::int AS failed_stock
        FROM stock_items
        GROUP BY trader_id
      ),
      d AS (
        SELECT trader_id,
          count(*) FILTER (WHERE status IN ('ACTIVE', 'PARTIAL') AND due_date < NOW())::int AS overdue_debtors
        FROM debtors
        GROUP BY trader_id
      )
      SELECT
        t.id AS trader_id,
        COALESCE(t.business_name, t.name) AS business_label,
        COALESCE(s.pending_sales, 0) + COALESCE(e.pending_expenses, 0) + COALESCE(st.pending_stock, 0) AS pending_records,
        COALESCE(s.failed_sales, 0) + COALESCE(e.failed_expenses, 0) + COALESCE(st.failed_stock, 0) AS failed_records,
        COALESCE(d.overdue_debtors, 0) AS overdue_debtors,
        COALESCE(e.recurring_due_soon, 0) AS recurring_due_soon,
        (
          (COALESCE(s.failed_sales, 0) + COALESCE(e.failed_expenses, 0) + COALESCE(st.failed_stock, 0)) * 4
          + (COALESCE(s.pending_sales, 0) + COALESCE(e.pending_expenses, 0) + COALESCE(st.pending_stock, 0)) * 2
          + COALESCE(d.overdue_debtors, 0) * 3
          + COALESCE(e.recurring_due_soon, 0)
        )::int AS risk_score
      FROM traders t
      LEFT JOIN s ON s.trader_id = t.id
      LEFT JOIN e ON e.trader_id = t.id
      LEFT JOIN st ON st.trader_id = t.id
      LEFT JOIN d ON d.trader_id = t.id
      ${whereSql}
      ORDER BY risk_score DESC, failed_records DESC, pending_records DESC
      LIMIT ${limitPlaceholder}`,
      ...params
    )

    return {
      data: {
        items: rows.map((row) => ({
          traderId: row.trader_id,
          businessLabel: row.business_label,
          pendingRecords: Number(row.pending_records ?? 0),
          failedRecords: Number(row.failed_records ?? 0),
          overdueDebtors: Number(row.overdue_debtors ?? 0),
          recurringDueSoon: Number(row.recurring_due_soon ?? 0),
          riskScore: Number(row.risk_score ?? 0),
        })),
      },
      error: null,
    }
  },

  async forceResync(input: ForceResyncInput) {
    const touched: Array<{ module: PlatformModuleKey; requeued: number }> = []

    for (const module of input.modules) {
      const table = MODULE_TO_TABLE[module]
      if (!table) {
        touched.push({ module, requeued: 0 })
        continue
      }

      const params: unknown[] = ['FAILED']
      let sql = `UPDATE ${table} SET sync_status = 'PENDING' WHERE sync_status = $1`

      if (input.traderId) {
        params.push(input.traderId)
        sql += ` AND trader_id = $2`
      }

      const result = await prisma.$executeRawUnsafe(sql, ...params)
      touched.push({ module, requeued: Number(result ?? 0) })
    }

    return {
      data: {
        traderId: input.traderId ?? null,
        results: touched,
        totalRequeued: touched.reduce((sum, row) => sum + row.requeued, 0),
      },
      error: null,
    }
  },
}
