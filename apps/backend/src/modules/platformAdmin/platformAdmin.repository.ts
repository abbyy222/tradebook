import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { PlatformAdminBusinessesQuery } from './platformAdmin.schema'

type CountByDayRow = {
  day: Date
  count: number
}

type BusinessDirectoryRow = {
  id: string
  label: string
  ownerName: string
  phoneNumber: string
  createdAt: Date
  lastActivityAt: Date | null
  salespeopleCount: number
  salesCount: number
  salesAmount: Prisma.Decimal | number | null
  expensesAmount: Prisma.Decimal | number | null
  receivablesAmount: Prisma.Decimal | number | null
  activityStatus: 'ACTIVE' | 'DORMANT' | 'INACTIVE' | 'NEW'
}

const getSalesCountByDay = (from: Date) =>
  prisma.$queryRaw<CountByDayRow[]>`
    SELECT date_trunc('day', sold_at) AS day, count(*)::int AS count
    FROM sales
    WHERE sold_at >= ${from}
    GROUP BY 1
    ORDER BY 1 ASC
  `

const getExpensesCountByDay = (from: Date) =>
  prisma.$queryRaw<CountByDayRow[]>`
    SELECT date_trunc('day', spent_at) AS day, count(*)::int AS count
    FROM expenses
    WHERE spent_at >= ${from}
    GROUP BY 1
    ORDER BY 1 ASC
  `

const getBusinessesRowsCte = (search?: string) => {
  const cleanedSearch = search?.trim()
  const searchPattern = cleanedSearch ? `%${cleanedSearch}%` : null
  const searchFilter = searchPattern
    ? Prisma.sql`
        AND (
          COALESCE(t.business_name, t.name) ILIKE ${searchPattern}
          OR t.name ILIKE ${searchPattern}
          OR t.phone_number ILIKE ${searchPattern}
        )
      `
    : Prisma.empty

  return Prisma.sql`
    WITH owner_base AS (
      SELECT
        t.id,
        COALESCE(t.business_name, t.name) AS label,
        t.name AS "ownerName",
        t.phone_number AS "phoneNumber",
        t.created_at AS "createdAt"
      FROM traders t
      WHERE t.role = 'OWNER'
      ${searchFilter}
    ),
    salespeople_agg AS (
      SELECT owner_trader_id AS trader_id, count(*)::int AS salespeople_count
      FROM traders
      WHERE role = 'SALESPERSON'
      GROUP BY owner_trader_id
    ),
    sales_agg AS (
      SELECT
        trader_id,
        count(*)::int AS sales_count,
        COALESCE(sum(amount), 0) AS sales_amount,
        max(sold_at) AS last_sale_at
      FROM sales
      GROUP BY trader_id
    ),
    expenses_agg AS (
      SELECT
        trader_id,
        COALESCE(sum(amount), 0) AS expenses_amount,
        max(spent_at) AS last_expense_at
      FROM expenses
      GROUP BY trader_id
    ),
    savings_agg AS (
      SELECT trader_id, max(saved_at) AS last_saving_at
      FROM savings_entries
      GROUP BY trader_id
    ),
    debtors_agg AS (
      SELECT
        trader_id,
        COALESCE(sum(total_owed - total_paid), 0) AS receivables_amount,
        max(updated_at) AS last_debtor_update_at
      FROM debtors
      GROUP BY trader_id
    ),
    rows AS (
      SELECT
        ob.id,
        ob.label,
        ob."ownerName",
        ob."phoneNumber",
        ob."createdAt",
        (
          SELECT max(v.ts)
          FROM (
            VALUES
              (sa.last_sale_at),
              (ea.last_expense_at),
              (sva.last_saving_at),
              (da.last_debtor_update_at)
          ) AS v(ts)
        ) AS "lastActivityAt",
        COALESCE(spa.salespeople_count, 0)::int AS "salespeopleCount",
        COALESCE(sa.sales_count, 0)::int AS "salesCount",
        COALESCE(sa.sales_amount, 0) AS "salesAmount",
        COALESCE(ea.expenses_amount, 0) AS "expensesAmount",
        COALESCE(da.receivables_amount, 0) AS "receivablesAmount",
        CASE
          WHEN (
            SELECT max(v.ts)
            FROM (
              VALUES
                (sa.last_sale_at),
                (ea.last_expense_at),
                (sva.last_saving_at),
                (da.last_debtor_update_at)
            ) AS v(ts)
          ) IS NULL
            AND ob."createdAt" >= now() - interval '7 days'
            THEN 'NEW'
          WHEN (
            SELECT max(v.ts)
            FROM (
              VALUES
                (sa.last_sale_at),
                (ea.last_expense_at),
                (sva.last_saving_at),
                (da.last_debtor_update_at)
            ) AS v(ts)
          ) >= now() - interval '7 days'
            THEN 'ACTIVE'
          WHEN (
            SELECT max(v.ts)
            FROM (
              VALUES
                (sa.last_sale_at),
                (ea.last_expense_at),
                (sva.last_saving_at),
                (da.last_debtor_update_at)
            ) AS v(ts)
          ) >= now() - interval '30 days'
            THEN 'DORMANT'
          ELSE 'INACTIVE'
        END AS "activityStatus"
      FROM owner_base ob
      LEFT JOIN salespeople_agg spa ON spa.trader_id = ob.id
      LEFT JOIN sales_agg sa ON sa.trader_id = ob.id
      LEFT JOIN expenses_agg ea ON ea.trader_id = ob.id
      LEFT JOIN savings_agg sva ON sva.trader_id = ob.id
      LEFT JOIN debtors_agg da ON da.trader_id = ob.id
    )
  `
}

type StatusCountRow = {
  activityStatus: 'ACTIVE' | 'DORMANT' | 'INACTIVE' | 'NEW'
  count: number
}

export const platformAdminRepository = {
  async getOverview(from: Date) {
    const internalCounts = await prisma.$queryRawUnsafe<Array<{ role: 'PLATFORM_ADMIN' | 'PLATFORM_DEV'; count: number }>>(
      `SELECT role, count(*)::int AS count
       FROM internal_users
       WHERE is_active = true
       GROUP BY role`
    )
    const adminCount = internalCounts.find((row) => row.role === 'PLATFORM_ADMIN')?.count ?? 0
    const developerCount = internalCounts.find((row) => row.role === 'PLATFORM_DEV')?.count ?? 0

    const recurringSoonDate = new Date()
    recurringSoonDate.setDate(recurringSoonDate.getDate() + 3)

    const [
      totalBusinesses,
      totalSalespeople,
      activeBusinesses,
      salesCount,
      expensesCount,
      debtorsCount,
      stockItemsCount,
      savingsCount,
      salesTotal,
      expensesTotal,
      topBusinesses,
      salesByDay,
      expensesByDay,
      syncPendingSales,
      syncPendingExpenses,
      syncPendingStock,
      syncFailedSales,
      syncFailedExpenses,
      syncFailedStock,
      overdueDebtors,
      recurringDueSoon,
    ] = await Promise.all([
      prisma.trader.count({ where: { role: 'OWNER' } }),
      prisma.trader.count({ where: { role: 'SALESPERSON' } }),
      prisma.sale.findMany({
        where: { soldAt: { gte: from } },
        distinct: ['traderId'],
        select: { traderId: true },
      }).then((rows) => rows.length),
      prisma.sale.count({ where: { soldAt: { gte: from } } }),
      prisma.expense.count({ where: { spentAt: { gte: from } } }),
      prisma.debtor.count({ where: { createdAt: { gte: from } } }),
      prisma.stockItem.count(),
      prisma.savingsEntry.count({ where: { savedAt: { gte: from } } }),
      prisma.sale.aggregate({ where: { soldAt: { gte: from } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { spentAt: { gte: from } }, _sum: { amount: true } }),
      prisma.trader.findMany({
        where: { role: 'OWNER' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, businessName: true, name: true, createdAt: true },
      }),
      getSalesCountByDay(from),
      getExpensesCountByDay(from),
      prisma.sale.count({ where: { syncStatus: 'PENDING' } }),
      prisma.expense.count({ where: { syncStatus: 'PENDING' } }),
      prisma.stockItem.count({ where: { syncStatus: 'PENDING' } }),
      prisma.sale.count({ where: { syncStatus: 'FAILED' } }),
      prisma.expense.count({ where: { syncStatus: 'FAILED' } }),
      prisma.stockItem.count({ where: { syncStatus: 'FAILED' } }),
      prisma.debtor.count({
        where: {
          dueDate: { lt: new Date() },
          status: { in: ['ACTIVE', 'PARTIAL'] },
        },
      }),
      prisma.expense.count({
        where: {
          expenseType: 'RECURRING',
          nextDueDate: { lte: recurringSoonDate },
        },
      }),
    ])

    return {
      totalBusinesses,
      totalSalespeople,
      totalInternalAdmins: adminCount,
      totalPlatformDevelopers: developerCount,
      activeBusinesses,
      salesCount,
      expensesCount,
      debtorsCount,
      stockItemsCount,
      savingsCount,
      salesAmount: Number(salesTotal._sum.amount ?? 0),
      expensesAmount: Number(expensesTotal._sum.amount ?? 0),
      topBusinesses: topBusinesses.map((biz: { id: string; businessName: string | null; name: string; createdAt: Date }) => ({
        id: biz.id,
        label: biz.businessName ?? biz.name,
        createdAt: biz.createdAt.toISOString(),
      })),
      salesByDay,
      expensesByDay,
      operations: {
        syncPending: syncPendingSales + syncPendingExpenses + syncPendingStock,
        syncFailed: syncFailedSales + syncFailedExpenses + syncFailedStock,
        overdueDebtors,
        recurringDueSoon,
      },
    }
  },

  async getBusinesses(query: PlatformAdminBusinessesQuery) {
    const offset = (query.page - 1) * query.pageSize
    const withRowsSql = getBusinessesRowsCte(query.search)
    const statusFilterSql = query.status
      ? Prisma.sql`WHERE "activityStatus" = ${query.status}`
      : Prisma.empty
    const sortSql =
      query.sort === 'sales'
        ? Prisma.sql`ORDER BY "salesAmount" DESC, "lastActivityAt" DESC NULLS LAST, "createdAt" DESC`
        : query.sort === 'newest'
          ? Prisma.sql`ORDER BY "createdAt" DESC`
          : Prisma.sql`ORDER BY "lastActivityAt" DESC NULLS LAST, "salesAmount" DESC, "createdAt" DESC`

    const rows = await prisma.$queryRaw<BusinessDirectoryRow[]>(
      Prisma.sql`
        ${withRowsSql}
        SELECT *
        FROM rows
        ${statusFilterSql}
        ${sortSql}
        LIMIT ${query.pageSize}
        OFFSET ${offset}
      `
    )

    const [{ total }] = await prisma.$queryRaw<Array<{ total: number }>>(
      Prisma.sql`
        ${withRowsSql}
        SELECT count(*)::int AS total
        FROM rows
        ${statusFilterSql}
      `
    )

    const summaryRows = await prisma.$queryRaw<StatusCountRow[]>(
      Prisma.sql`
        ${withRowsSql}
        SELECT "activityStatus", count(*)::int AS count
        FROM rows
        GROUP BY "activityStatus"
      `
    )

    const summary = {
      active: 0,
      dormant: 0,
      inactive: 0,
      newlyOnboarded: 0,
    }

    for (const row of summaryRows) {
      if (row.activityStatus === 'ACTIVE') summary.active = Number(row.count ?? 0)
      if (row.activityStatus === 'DORMANT') summary.dormant = Number(row.count ?? 0)
      if (row.activityStatus === 'INACTIVE') summary.inactive = Number(row.count ?? 0)
      if (row.activityStatus === 'NEW') summary.newlyOnboarded = Number(row.count ?? 0)
    }

    return {
      items: rows.map((row) => ({
        id: row.id,
        label: row.label,
        ownerName: row.ownerName,
        phoneNumber: row.phoneNumber,
        createdAt: row.createdAt.toISOString(),
        lastActivityAt: row.lastActivityAt ? row.lastActivityAt.toISOString() : null,
        salespeopleCount: Number(row.salespeopleCount ?? 0),
        salesCount: Number(row.salesCount ?? 0),
        salesAmount: Number(row.salesAmount ?? 0),
        expensesAmount: Number(row.expensesAmount ?? 0),
        receivablesAmount: Number(row.receivablesAmount ?? 0),
        activityStatus: row.activityStatus,
      })),
      total,
      summary,
    }
  },
}
