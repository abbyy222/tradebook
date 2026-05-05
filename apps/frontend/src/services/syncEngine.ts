import { db } from '@/db'
import { salesApi } from '@/api/sales.api'
import { expensesApi } from '@/api/expenses.api'
import { stockApi } from '@/api/stock.api'
import { debtorsApi } from '@/api/debtors.api'
import { savingsApi } from '@/api/savings.api'
import { suppliersApi } from '@/api/suppliers.api'
import { isNetworkReachable } from '@/services/networkHealth'
import { isQueueSyncStatus, isRetryableSyncStatus } from '@/services/syncStatus'

const BATCH_SIZE = 50
const SYNC_QUEUE_THRESHOLD = 10
const SYNC_COOLDOWN_MS = 12_000
const SYNC_JITTER_MIN_MS = 1_000
const SYNC_JITTER_MAX_MS = 8_000
const MAX_BATCHES_PER_ENTITY_PER_CYCLE = 2
const MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE = 40

const normalizeIsoDateTime = (value?: string) => {
  if (!value) return undefined
  const raw = value.trim()
  if (!raw) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00.000Z`).toISOString()
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

const sanitizeEndDate = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return endDate
  return new Date(endDate).getTime() >= new Date(startDate).getTime() ? endDate : undefined
}

const getUnsyncedCreditSalesForDebtor = async (debtorId: string) => {
  return db.sales
    .filter(
      (sale) =>
        sale.debtorId === debtorId &&
        sale.paymentType === 'DEBT' &&
        isRetryableSyncStatus(sale.syncStatus)
    )
    .toArray()
}

class SyncEngine {
  private isSyncing = false
  private nextAllowedSyncAt = 0
  private scheduledThresholdSync: ReturnType<typeof setTimeout> | null = null

  private async syncAllInternal(options?: { bypassCooldown?: boolean }) {
    if (this.isSyncing) return
    if (!options?.bypassCooldown && Date.now() < this.nextAllowedSyncAt) return
    this.isSyncing = true

    try {
      await this.syncStockPipeline()
      await this.syncDebtorPipeline()
      await Promise.allSettled([
        this.syncSales(),
        this.syncExpenses(),
        this.syncSavings(),
        this.syncSuppliers(),
      ])
      this.nextAllowedSyncAt = Date.now() + SYNC_COOLDOWN_MS
    } finally {
      this.isSyncing = false
    }
  }

  async syncAll() {
    await this.syncAllInternal()
  }

  async handleReconnect() {
    if (!isNetworkReachable()) return

    // Debtors are intentionally non-queued:
    // offline saves should sync immediately once network returns.
    await this.syncDebtorPipeline()

    await this.promoteOfflineSavedRecordsToQueued()

    const queueCount = await this.getQueueRecordCount()
    if (queueCount >= SYNC_QUEUE_THRESHOLD) {
      if (this.scheduledThresholdSync) {
        clearTimeout(this.scheduledThresholdSync)
        this.scheduledThresholdSync = null
      }
      this.nextAllowedSyncAt = 0
      await this.syncAllInternal({ bypassCooldown: true })
      return
    }

    // Keep under-threshold records as QUEUED and locked locally.
  }

  async syncIfQueueThresholdReached() {
    if (!isNetworkReachable()) return false
    if (this.isSyncing) return false
    if (this.scheduledThresholdSync) return false
    if (Date.now() < this.nextAllowedSyncAt) return false

    const queued = await this.getQueueRecordCount()
    if (queued < SYNC_QUEUE_THRESHOLD) return false

    const jitterMs = this.getRandomInt(SYNC_JITTER_MIN_MS, SYNC_JITTER_MAX_MS)
    this.scheduledThresholdSync = setTimeout(() => {
      this.scheduledThresholdSync = null
      void this.syncAll()
    }, jitterMs)

    return true
  }

  private async getQueueRecordCount() {
    const [sales, expenses, stockItems, stockAdjustments, debtors, debtorPayments, savings, suppliers] = await Promise.all([
      db.sales.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
      db.expenses.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
      db.stockItems.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
      db.stockAdjustments.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
      db.debtors.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
      db.debtorPayments.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
      db.savings.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
      db.suppliers.filter((row) => isQueueSyncStatus(row.syncStatus)).count(),
    ])

    return sales + expenses + stockItems + stockAdjustments + debtors + debtorPayments + savings + suppliers
  }

  private async promoteOfflineSavedRecordsToQueued() {
    await Promise.all([
      db.sales.filter((row) => row.syncStatus === 'PENDING').modify({ syncStatus: 'QUEUED' }),
      db.expenses.filter((row) => row.syncStatus === 'PENDING').modify({ syncStatus: 'QUEUED' }),
      db.stockItems.filter((row) => row.syncStatus === 'PENDING').modify({ syncStatus: 'QUEUED' }),
      db.stockAdjustments.filter((row) => row.syncStatus === 'PENDING').modify({ syncStatus: 'QUEUED' }),
      db.savings.filter((row) => row.syncStatus === 'PENDING').modify({ syncStatus: 'QUEUED' }),
      db.suppliers.filter((row) => row.syncStatus === 'PENDING').modify({ syncStatus: 'QUEUED' }),
    ])
  }

  private async syncSales() {
    const retryable = await db.sales.filter((sale) => isRetryableSyncStatus(sale.syncStatus)).toArray()
    if (retryable.length === 0) return

    const capped = retryable.slice(0, MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE)
    for (const sale of capped) {
      try {
        await salesApi.sync({
          id: sale.id,
          itemName: sale.itemName,
          stockItemId: (sale as any).stockItemId,
          quantity: (sale as any).quantity ?? 1,
          unitPrice: (sale as any).unitPrice ?? sale.amount,
          amount: sale.amount,
          pricingMode: (sale as any).pricingMode,
          paymentType: sale.paymentType,
          debtorId: sale.debtorId,
          soldAt: sale.soldAt,
        })
        await db.sales.update(sale.id, { syncStatus: 'SYNCED' })
      } catch (error) {
        await db.sales.update(sale.id, { syncStatus: 'FAILED' })
        console.error('Sales sync failed:', error)
      }
    }
  }

  private async syncExpenses() {
    const retryable = await db.expenses.filter((expense) => isRetryableSyncStatus(expense.syncStatus)).toArray()
    if (retryable.length === 0) return

    const capped = retryable.slice(0, BATCH_SIZE * MAX_BATCHES_PER_ENTITY_PER_CYCLE)
    const batches = this.chunk(capped, BATCH_SIZE)
    for (const batch of batches) {
      try {
        await expensesApi.syncBatch(batch.map((expense) => {
          const spentAt = normalizeIsoDateTime(expense.spentAt) ?? new Date().toISOString()
          const startDate = normalizeIsoDateTime(expense.startDate)
          return {
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            category: (expense.category ?? 'OTHER') as any,
            expenseType: (expense.expenseType ?? 'ONE_TIME') as any,
            frequency: expense.expenseType === 'RECURRING' ? expense.frequency : undefined,
            note: expense.note,
            spentAt,
            startDate,
            endDate: sanitizeEndDate(startDate, normalizeIsoDateTime(expense.endDate)),
            nextDueDate: normalizeIsoDateTime(expense.nextDueDate),
          }
        }))

        await db.transaction('rw', db.expenses, async () => {
          for (const expense of batch) {
            await db.expenses.update(expense.id, { syncStatus: 'SYNCED' })
          }
        })
      } catch (error) {
        await db.transaction('rw', db.expenses, async () => {
          for (const expense of batch) {
            await db.expenses.update(expense.id, { syncStatus: 'FAILED' })
          }
        })
        console.error('Expense batch sync failed:', error)
      }
    }
  }

  private async syncStockPipeline() {
    await this.syncStockItems()
    await this.syncStockAdjustments()
  }

  private async syncStockItems() {
    const retryable = await db.stockItems
      .filter((item) => isRetryableSyncStatus(item.syncStatus))
      .toArray()

    if (retryable.length === 0) return

    for (const item of retryable.slice(0, MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE)) {
      try {
        await stockApi.sync({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          unitName: item.unitName,
          unitPrice: item.unitPrice,
          wholesalePrice: item.wholesalePrice ?? null,
          wholesaleMinQty: item.wholesaleMinQty ?? null,
          // Legacy rows created before Phase 2 may not have costPrice yet.
          // We fall back to unitPrice so the row can still sync instead of getting stranded forever.
          costPrice: item.costPrice ?? item.unitPrice,
          lowStockThreshold: item.lowStockThreshold,
        })
        await db.stockItems.update(item.id, { syncStatus: 'SYNCED' })
      } catch (error) {
        await db.stockItems.update(item.id, { syncStatus: 'FAILED' })
        console.error('Stock item sync failed:', error)
      }
    }
  }

  private async syncDebtorPipeline() {
    await this.syncDebtors()
    await this.syncDebtorPayments()
  }

  private async syncDebtors() {
    const retryable = await db.debtors.filter((debtor) => isRetryableSyncStatus(debtor.syncStatus)).toArray()
    if (retryable.length === 0) return

    for (const debtor of retryable.slice(0, MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE)) {
      try {
        const pendingCreditSales = await getUnsyncedCreditSalesForDebtor(debtor.id)
        const pendingCreditTotal = pendingCreditSales.reduce((sum, sale) => sum + sale.amount, 0)
        const openingTotalOwed = Math.max(Number((debtor.totalOwed - pendingCreditTotal).toFixed(2)), 0)
        const created = await debtorsApi.create({
          id: debtor.id,
          customerName: debtor.customerName,
          phoneNumber: debtor.phoneNumber ?? undefined,
          totalOwed: openingTotalOwed,
          dueDate: debtor.dueDate ?? undefined,
        })

        const totalOwed = Number((created.totalOwed + pendingCreditTotal).toFixed(2))
        const balance = Number((totalOwed - created.totalPaid).toFixed(2))

        await db.debtors.put({
          ...created,
          totalOwed,
          balance,
          status: balance <= 0 ? 'CLEARED' : created.totalPaid > 0 ? 'PARTIAL' : 'ACTIVE',
          syncStatus: 'SYNCED',
          updatedAt: new Date().toISOString(),
        })
      } catch {
        await db.debtors.update(debtor.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncDebtorPayments() {
    const retryable = await db.debtorPayments.filter((payment) => isRetryableSyncStatus(payment.syncStatus)).sortBy('createdAt')
    if (retryable.length === 0) return

    for (const payment of retryable.slice(0, MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE)) {
      try {
        const updatedDebtor = await debtorsApi.recordPayment(payment.debtorId, {
          amount: payment.amount,
          paidAt: payment.paidAt,
          note: payment.note,
        })

        await db.transaction('rw', db.debtorPayments, db.debtors, async () => {
          await db.debtorPayments.update(payment.id, { syncStatus: 'SYNCED' })
          await db.debtors.put({ ...updatedDebtor, syncStatus: 'SYNCED', updatedAt: new Date().toISOString() })
        })
      } catch {
        await db.debtorPayments.update(payment.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncStockAdjustments() {
    const pending = await db.stockAdjustments.filter((adjustment) => isRetryableSyncStatus(adjustment.syncStatus)).sortBy('createdAt')
    if (pending.length === 0) return

    for (const adjustment of pending.slice(0, MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE)) {
      try {
        const updated = await stockApi.adjust(adjustment.stockItemId, {
          delta: adjustment.delta,
          reason: adjustment.reason,
          unitName: adjustment.unitName,
          unitPrice: adjustment.unitPrice,
          costPrice: adjustment.costPrice,
          wholesalePrice: adjustment.wholesalePrice,
          wholesaleMinQty: adjustment.wholesaleMinQty,
          lowStockThreshold: adjustment.lowStockThreshold,
        })
        await db.transaction('rw', db.stockItems, db.stockAdjustments, async () => {
          await db.stockItems.put({ ...updated, syncStatus: 'SYNCED' })
          await db.stockAdjustments.update(adjustment.id, { syncStatus: 'SYNCED' })
        })
      } catch {
        await db.stockAdjustments.update(adjustment.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncSavings() {
    const retryable = await db.savings.filter((entry) => isRetryableSyncStatus(entry.syncStatus)).toArray()
    if (retryable.length === 0) return

    for (const entry of retryable.slice(0, MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE)) {
      try {
        const synced = await savingsApi.sync({
          id: entry.id,
          amount: entry.amount,
          savedAt: entry.savedAt,
          note: entry.note,
        })

        await db.savings.put({
          ...synced,
          syncStatus: 'SYNCED',
        })
      } catch {
        await db.savings.update(entry.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncSuppliers() {
    const retryable = await db.suppliers.filter((supplier) => isRetryableSyncStatus(supplier.syncStatus)).toArray()
    if (retryable.length === 0) return

    for (const supplier of retryable.slice(0, MAX_SINGLE_RECORDS_PER_ENTITY_PER_CYCLE)) {
      try {
        const synced = await suppliersApi.sync({
          id: supplier.id,
          name: supplier.name,
          phoneNumber: supplier.phoneNumber ?? undefined,
          itemCategory: supplier.itemCategory ?? undefined,
          note: supplier.note ?? undefined,
        })

        await db.suppliers.put({
          ...synced,
          syncStatus: 'SYNCED',
        })
      } catch {
        await db.suppliers.update(supplier.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

export const syncEngine = new SyncEngine()

export const initSyncEngine = () => {
  window.addEventListener('online', () => {
    console.log('Back online - promoting offline records to queue...')
    void syncEngine.handleReconnect()
  })

  if (isNetworkReachable()) {
    void syncEngine.handleReconnect()
  }
}
