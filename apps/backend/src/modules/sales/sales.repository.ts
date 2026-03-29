// src/modules/sales/sales.repository.ts
// This file is the ONLY place in the entire codebase that writes SQL
// (via Prisma). Every query here is deliberately optimised.
// Read every comment — each one explains a scale decision.

import { CreateSaleInput, ListSalesQuery } from './sales.schema'
import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'

// --- Field projection ---
// We define EXACTLY which fields to return from the DB.
// Never use findMany() without select — it returns every column
// including ones you don't need. At scale, pulling unnecessary
// columns wastes DB memory, network bandwidth, and serialisation time.
// This object gets reused across all queries for consistency.
const saleSelect = {
  id: true,
  itemName: true,
  amount: true,
  paymentType: true,
  debtorId: true,
  syncStatus: true,
  soldAt: true,
  createdAt: true,
  // We do NOT select traderId — the caller already knows their own ID.
  // We do NOT select the full debtor object — use a separate endpoint
  // if you need debtor details. Keep list queries lean.
} satisfies Prisma.SaleSelect

export const salesRepository = {

  // --- Upsert (the sync operation) ---
  // upsert = "insert if not exists, update if exists"
  // This is idempotent — calling it 10 times with the same ID
  // produces the same result as calling it once.
  // Critical for offline sync where retries are common.
  async upsert(traderId: string, data: CreateSaleInput) {
    return prisma.sale.upsert({
      where: { id: data.id },
      // If the record doesn't exist yet — create it fully
      create: {
        id: data.id,
        traderId,
        itemName: data.itemName,
        // Prisma's Decimal type ensures exact arithmetic — no float errors
        amount: new Prisma.Decimal(data.amount),
        paymentType: data.paymentType,
        debtorId: data.debtorId ?? null,
        syncStatus: 'SYNCED',  // it's on the server now — mark it synced
        soldAt: new Date(data.soldAt),
      },
      // If it already exists — update only the sync status
      // We don't overwrite item name or amount on re-sync
      // because the server version is considered authoritative
      update: {
        syncStatus: 'SYNCED',
      },
      select: saleSelect,
    })
  },

  // --- Bulk upsert ---
  // For syncing many sales at once. We use a transaction so that
  // either ALL sales sync successfully or NONE do.
  // Partial sync = corrupted state = very hard to debug.
  // A transaction is your atomic safety net.
  async bulkUpsert(traderId: string, sales: CreateSaleInput[]) {
    // prisma.$transaction runs all operations in a single DB transaction.
    // If any one fails, the entire batch rolls back automatically.
    return prisma.$transaction(
      sales.map(sale =>
        prisma.sale.upsert({
          where: { id: sale.id },
          create: {
            id: sale.id,
            traderId,
            itemName: sale.itemName,
            amount: new Prisma.Decimal(sale.amount),
            paymentType: sale.paymentType,
            debtorId: sale.debtorId ?? null,
            syncStatus: 'SYNCED',
            soldAt: new Date(sale.soldAt),
          },
          update: { syncStatus: 'SYNCED' },
          select: saleSelect,
        })
      )
    )
  },

  // --- Cursor-based paginated list ---
  // This is the most important query in the system.
  // It uses the compound index (trader_id + sold_at) we defined in the schema.
  // Postgres can answer this query by jumping directly to the right
  // position in the index — no scanning, no skipping, just fast reads.
  async findMany(traderId: string, query: ListSalesQuery) {
    const { cursor, pageSize, from, to, paymentType } = query

    // Build the WHERE clause dynamically.
    // Only add conditions that are actually provided.
    // Unnecessary WHERE conditions force Postgres to do extra work.
    const where: Prisma.SaleWhereInput = {
      traderId, // always filter by trader — never return another trader's data

      // Cursor: if provided, only return records OLDER than the cursor.
      // soldAt less than cursor = the next page going backwards in time.
      // This is how the phone "loads more" — it sends the oldest
      // soldAt it already has, and we return the next batch before it.
      ...(cursor && {
        soldAt: { lt: new Date(cursor) },
      }),

      // Date range: for reports like "show me this week's sales"
      // We merge with cursor if both are provided using Prisma's AND logic
      ...(from || to
        ? {
            soldAt: {
              ...(cursor && { lt: new Date(cursor) }),
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),

      // Payment type filter: "show only DEBT sales" for debtor tracking
      ...(paymentType && { paymentType }),
    }

    // We fetch pageSize + 1 records.
    // Why +1? To check if there's a next page without a separate COUNT query.
    // If we get 21 records when pageSize is 20, there IS a next page.
    // We return only 20 to the client and use the 21st to set hasNextPage.
    // This avoids an expensive COUNT(*) on every single list request.
    const rawSales = await prisma.sale.findMany({
      where,
      select: saleSelect,
      orderBy: { soldAt: 'desc' }, // newest first
      take: pageSize + 1,
    })

    const hasNextPage = rawSales.length > pageSize
    const sales = hasNextPage ? rawSales.slice(0, pageSize) : rawSales

    // The next cursor is the soldAt of the last item we're returning.
    // The client sends this back on the next request to get the next page.
    const nextCursor =
      hasNextPage && sales.length > 0
        ? sales[sales.length - 1].soldAt.toISOString()
        : null

    return { sales, nextCursor, hasNextPage }
  },

  // --- Dashboard aggregates ---
  // The dashboard shows: today's sales total, this week's total.
  // We use Prisma's aggregate() instead of fetching all records and
  // summing in JavaScript. Let the DATABASE do the math —
  // it's orders of magnitude faster on large datasets.
  async getDashboardStats(traderId: string) {
    const now = new Date()

    // Start of today in local time
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // Start of this week (Monday)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)

    // Run both aggregates in PARALLEL with Promise.all.
    // Sequential: 200ms + 200ms = 400ms total.
    // Parallel:   max(200ms, 200ms) = 200ms total.
    // This pattern — parallelising independent async operations —
    // is one of the most impactful performance wins in Node.js.
    const [todayStats, weekStats, totalStats] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          traderId,
          soldAt: { gte: todayStart },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.sale.aggregate({
        where: {
          traderId,
          soldAt: { gte: weekStart },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.sale.aggregate({
        where: { traderId },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ])

    return {
      today: {
        total: todayStats._sum.amount ?? new Prisma.Decimal(0),
        count: todayStats._count.id,
      },
      thisWeek: {
        total: weekStats._sum.amount ?? new Prisma.Decimal(0),
        count: weekStats._count.id,
      },
      allTime: {
        total: totalStats._sum.amount ?? new Prisma.Decimal(0),
        count: totalStats._count.id,
      },
    }
  },

  // --- Find one (for detail view) ---
  async findById(id: string, traderId: string) {
    // We always include traderId in single-record lookups.
    // Without it, trader A could fetch trader B's sale
    // just by guessing the UUID. This is called IDOR
    // (Insecure Direct Object Reference) and it's a real attack.
    return prisma.sale.findFirst({
      where: { id, traderId },
      select: saleSelect,
    })
  },

  // --- Delete ---
  async delete(id: string, traderId: string) {
    // Same security pattern — include traderId in the where clause
    return prisma.sale.deleteMany({
      where: { id, traderId },
    })
  },
}
