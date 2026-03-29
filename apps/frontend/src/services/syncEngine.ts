// src/services/syncEngine.ts
// The sync engine is the bridge between offline and online.
// It runs automatically whenever the device comes online.
//
// Mental model:
// Dexie is the source of truth for the UI - always fast, always available.
// The backend is the source of truth for persistence - survives phone loss.
// The sync engine keeps them consistent.

import { db } from '@/db'
import { salesApi } from '@/api/sales.api'
import { expensesApi } from '@/api/expenses.api'
import { stockApi } from '@/api/stock.api'
import { debtorsApi } from '@/api/debtors.api'

// Maximum number of records to sync in one batch.
// We don't send ALL pending records at once - if a trader
// has been offline for a week with 500 pending sales,
// sending 500 at once could timeout on a slow connection.
// We chunk into batches of 50.
const BATCH_SIZE = 50

class SyncEngine {
  private isSyncing = false

  // Called whenever the app detects an internet connection
  async syncAll() {
    // Guard: don't run multiple syncs simultaneously
    if (this.isSyncing) return
    this.isSyncing = true

    try {
      // Run all syncs in parallel - independent operations
      await Promise.allSettled([
        this.syncSales(),
        this.syncExpenses(),
        this.syncDebtorPipeline(),
        this.syncStockPipeline(),
      ])
      // allSettled (not Promise.all) - if sales sync fails,
      // expenses and stock still continue. We don't want one
      // failure to block everything else.
    } finally {
      // Always release the lock, even if something throws
      this.isSyncing = false
    }
  }

  private async syncSales() {
    // Fetch all retryable sales from local Dexie DB
    const retryable = await db.sales
      .filter((sale) => sale.syncStatus === 'PENDING' || sale.syncStatus === 'FAILED')
      .toArray()

    if (retryable.length === 0) return

    // Chunk the pending records into batches of BATCH_SIZE
    const batches = this.chunk(retryable, BATCH_SIZE)

    for (const batch of batches) {
      try {
        // Send the batch to the backend
        await salesApi.syncBatch(
          batch.map((sale) => ({
            id: sale.id,
            itemName: sale.itemName,
            amount: sale.amount,
            paymentType: sale.paymentType,
            debtorId: sale.debtorId,
            soldAt: sale.soldAt,
          }))
        )

        // Mark as SYNCED in local DB
        // We use a transaction so the status update is atomic -
        // either all records in the batch are marked SYNCED or none are
        await db.transaction('rw', db.sales, async () => {
          for (const sale of batch) {
            await db.sales.update(sale.id, { syncStatus: 'SYNCED' })
          }
        })
      } catch (error) {
        // If a batch fails, mark those records as FAILED.
        // They'll be retried on the next sync cycle.
        // We don't throw - we continue to the next batch.
        await db.transaction('rw', db.sales, async () => {
          for (const sale of batch) {
            await db.sales.update(sale.id, { syncStatus: 'FAILED' })
          }
        })
        console.error('Sales batch sync failed:', error)
      }
    }
  }

  private async syncExpenses() {
    const pending = await db.expenses
      .where('syncStatus')
      .equals('PENDING')
      .toArray()

    if (pending.length === 0) return

    const batches = this.chunk(pending, BATCH_SIZE)

    for (const batch of batches) {
      try {
        await expensesApi.syncBatch(
          batch.map((expense) => ({
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            category: expense.category as any,
            spentAt: expense.spentAt,
          }))
        )
        await db.transaction('rw', db.expenses, async () => {
          for (const expense of batch) {
            await db.expenses.update(expense.id, { syncStatus: 'SYNCED' })
          }
        })
      } catch {
        await db.transaction('rw', db.expenses, async () => {
          for (const expense of batch) {
            await db.expenses.update(expense.id, { syncStatus: 'FAILED' })
          }
        })
      }
    }
  }

  private async syncStockPipeline() {
    await this.syncStockItems()
    await this.syncStockAdjustments()
  }

  private async syncStockItems() {
    const pending = await db.stockItems
      .where('syncStatus')
      .equals('PENDING')
      .toArray()

    if (pending.length === 0) return

    // Stock items sync one at a time - each upsert uses
    // the unique (traderId, itemName) constraint on the backend.
    // Batch sync would need the same guarantee so we keep it simple.
    for (const item of pending) {
      try {
        await stockApi.sync({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lowStockThreshold: item.lowStockThreshold,
        })
        await db.stockItems.update(item.id, { syncStatus: 'SYNCED' })
      } catch {
        await db.stockItems.update(item.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncDebtorPipeline() {
    await this.syncDebtors()
    await this.syncDebtorPayments()
  }

  private async syncDebtors() {
    const retryable = await db.debtors
      .filter((debtor) => debtor.syncStatus === 'PENDING' || debtor.syncStatus === 'FAILED')
      .toArray()

    if (retryable.length === 0) return

    for (const debtor of retryable) {
      try {
        const created = await debtorsApi.create({
          id: debtor.id,
          customerName: debtor.customerName,
          phoneNumber: debtor.phoneNumber ?? undefined,
          totalOwed: debtor.totalOwed,
          dueDate: debtor.dueDate ?? undefined,
        })

        await db.debtors.put({
          ...created,
          syncStatus: 'SYNCED',
          updatedAt: new Date().toISOString(),
        })
      } catch {
        await db.debtors.update(debtor.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncDebtorPayments() {
    const retryable = await db.debtorPayments
      .filter((payment) => payment.syncStatus === 'PENDING' || payment.syncStatus === 'FAILED')
      .sortBy('createdAt')

    if (retryable.length === 0) return

    for (const payment of retryable) {
      try {
        const updatedDebtor = await debtorsApi.recordPayment(payment.debtorId, {
          amount: payment.amount,
          paidAt: payment.paidAt,
          note: payment.note,
        })

        await db.transaction('rw', db.debtorPayments, db.debtors, async () => {
          await db.debtorPayments.update(payment.id, { syncStatus: 'SYNCED' })
          await db.debtors.put({
            ...updatedDebtor,
            syncStatus: 'SYNCED',
            updatedAt: new Date().toISOString(),
          })
        })
      } catch {
        await db.debtorPayments.update(payment.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncStockAdjustments() {
    const pending = await db.stockAdjustments
      .where('syncStatus')
      .equals('PENDING')
      .sortBy('createdAt')

    if (pending.length === 0) return

    for (const adjustment of pending) {
      try {
        const updated = await stockApi.adjust(
          adjustment.stockItemId,
          adjustment.delta,
          adjustment.reason
        )

        await db.transaction('rw', db.stockItems, db.stockAdjustments, async () => {
          await db.stockItems.put({
            ...updated,
            syncStatus: 'SYNCED',
          })
          await db.stockAdjustments.update(adjustment.id, { syncStatus: 'SYNCED' })
        })
      } catch {
        await db.stockAdjustments.update(adjustment.id, { syncStatus: 'FAILED' })
      }
    }
  }

  // Generic array chunker - splits [1,2,3,4,5] into [[1,2],[3,4],[5]]
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// Singleton - one sync engine for the entire app
export const syncEngine = new SyncEngine()

// --- Online/offline event listeners ---
// These wire the sync engine to the browser's network detection.
// When the browser goes online, trigger a sync automatically.
// The trader never has to manually trigger anything.
export const initSyncEngine = () => {
  window.addEventListener('online', () => {
    console.log('Back online - syncing...')
    syncEngine.syncAll()
  })

  // Also sync on app load - in case records are pending
  // from a previous offline session
  if (navigator.onLine) {
    syncEngine.syncAll()
  }
}
