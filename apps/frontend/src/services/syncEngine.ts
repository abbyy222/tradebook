import { db } from '@/db'
import { salesApi } from '@/api/sales.api'
import { expensesApi } from '@/api/expenses.api'
import { stockApi } from '@/api/stock.api'
import { debtorsApi } from '@/api/debtors.api'
import { savingsApi } from '@/api/savings.api'
import { suppliersApi } from '@/api/suppliers.api'

const BATCH_SIZE = 50

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

class SyncEngine {
  private isSyncing = false

  async syncAll() {
    if (this.isSyncing) return
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
    } finally {
      this.isSyncing = false
    }
  }

  private async syncSales() {
    const retryable = await db.sales.filter((sale) => sale.syncStatus === 'PENDING' || sale.syncStatus === 'FAILED').toArray()
    if (retryable.length === 0) return

    const batches = this.chunk(retryable, BATCH_SIZE)
    for (const batch of batches) {
      try {
        await salesApi.syncBatch(batch.map((sale) => ({
          id: sale.id,
          itemName: sale.itemName,
          stockItemId: (sale as any).stockItemId,
          quantity: (sale as any).quantity ?? 1,
          unitPrice: (sale as any).unitPrice ?? sale.amount,
          amount: sale.amount,
          paymentType: sale.paymentType,
          debtorId: sale.debtorId,
          soldAt: sale.soldAt,
        })))

        await db.transaction('rw', db.sales, async () => {
          for (const sale of batch) {
            await db.sales.update(sale.id, { syncStatus: 'SYNCED' })
          }
        })
      } catch (error) {
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
    const retryable = await db.expenses.filter((expense) => expense.syncStatus === 'PENDING' || expense.syncStatus === 'FAILED').toArray()
    if (retryable.length === 0) return

    const batches = this.chunk(retryable, BATCH_SIZE)
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
      .filter((item) => item.syncStatus === 'PENDING' || item.syncStatus === 'FAILED')
      .toArray()

    if (retryable.length === 0) return

    for (const item of retryable) {
      try {
        await stockApi.sync({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
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
    const retryable = await db.debtors.filter((debtor) => debtor.syncStatus === 'PENDING' || debtor.syncStatus === 'FAILED').toArray()
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

        await db.debtors.put({ ...created, syncStatus: 'SYNCED', updatedAt: new Date().toISOString() })
      } catch {
        await db.debtors.update(debtor.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncDebtorPayments() {
    const retryable = await db.debtorPayments.filter((payment) => payment.syncStatus === 'PENDING' || payment.syncStatus === 'FAILED').sortBy('createdAt')
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
          await db.debtors.put({ ...updatedDebtor, syncStatus: 'SYNCED', updatedAt: new Date().toISOString() })
        })
      } catch {
        await db.debtorPayments.update(payment.id, { syncStatus: 'FAILED' })
      }
    }
  }

  private async syncStockAdjustments() {
    const pending = await db.stockAdjustments.where('syncStatus').equals('PENDING').sortBy('createdAt')
    if (pending.length === 0) return

    for (const adjustment of pending) {
      try {
        const updated = await stockApi.adjust(adjustment.stockItemId, adjustment.delta, adjustment.reason)
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
    const retryable = await db.savings.filter((entry) => entry.syncStatus === 'PENDING' || entry.syncStatus === 'FAILED').toArray()
    if (retryable.length === 0) return

    for (const entry of retryable) {
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
    const retryable = await db.suppliers.filter((supplier) => supplier.syncStatus === 'PENDING' || supplier.syncStatus === 'FAILED').toArray()
    if (retryable.length === 0) return

    for (const supplier of retryable) {
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
}

export const syncEngine = new SyncEngine()

export const initSyncEngine = () => {
  window.addEventListener('online', () => {
    console.log('Back online - syncing...')
    syncEngine.syncAll()
  })

  if (navigator.onLine) {
    syncEngine.syncAll()
  }
}
