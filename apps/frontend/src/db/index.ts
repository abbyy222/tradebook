import Dexie, { type EntityTable } from 'dexie'
import type {
  SavingsEntryDTO,
  SupplierDTO,
  DebtorDTO,
  ExpenseDTO,
  SaleDTO,
  StockItemDTO,
  TraderDTO,
} from '@tradebook/shared-types'

export interface LocalSale extends Omit<SaleDTO, 'syncStatus'> {
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalExpense extends Omit<ExpenseDTO, 'syncStatus'> {
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalStockItem extends Omit<StockItemDTO, 'syncStatus'> {
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalStockAdjustment {
  id: string
  stockItemId: string
  delta: number
  reason: 'restock' | 'sale_adjustment' | 'damage' | 'correction'
  unitPrice?: number
  costPrice?: number
  lowStockThreshold?: number
  createdAt: string
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalDebtor extends DebtorDTO {
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
  updatedAt: string
}

export interface LocalDebtorPayment {
  id: string
  debtorId: string
  amount: number
  paidAt: string
  note?: string
  createdAt: string
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalSavingsEntry extends Omit<SavingsEntryDTO, 'createdByTraderId'> {
  createdByTraderId?: string
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalSupplier extends SupplierDTO {
  syncStatus: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

class TradeBookDB extends Dexie {
  sales!: EntityTable<LocalSale, 'id'>
  expenses!: EntityTable<LocalExpense, 'id'>
  stockItems!: EntityTable<LocalStockItem, 'id'>
  stockAdjustments!: EntityTable<LocalStockAdjustment, 'id'>
  debtors!: EntityTable<LocalDebtor, 'id'>
  debtorPayments!: EntityTable<LocalDebtorPayment, 'id'>
  savings!: EntityTable<LocalSavingsEntry, 'id'>
  suppliers!: EntityTable<LocalSupplier, 'id'>
  trader!: EntityTable<TraderDTO & { id: string }, 'id'>

  constructor() {
    super('TradeBookDB')

    this.version(7).stores({
      sales: '&id, syncStatus, soldAt, paymentType, stockItemId',
      expenses: '&id, syncStatus, spentAt, category, expenseType, frequency, nextDueDate',
      stockItems: '&id, syncStatus, itemName, updatedAt',
      stockAdjustments: '&id, stockItemId, syncStatus, createdAt, reason',
      debtors: '&id, syncStatus, status, customerName, createdAt',
      debtorPayments: '&id, debtorId, syncStatus, createdAt, paidAt',
      trader: '&id',
    })

    this.version(8).stores({
      sales: '&id, syncStatus, soldAt, paymentType, stockItemId',
      expenses: '&id, syncStatus, spentAt, category, expenseType, frequency, nextDueDate',
      stockItems: '&id, syncStatus, itemName, updatedAt',
      stockAdjustments: '&id, stockItemId, syncStatus, createdAt, reason',
      debtors: '&id, syncStatus, status, customerName, createdAt',
      debtorPayments: '&id, debtorId, syncStatus, createdAt, paidAt',
      savings: '&id, syncStatus, savedAt, createdAt',
      suppliers: '&id, syncStatus, name, createdAt',
      trader: '&id',
    })
  }
}

export const db = new TradeBookDB()

export const clearLocalAppData = async () => {
  for (const table of db.tables) {
    await table.clear()
  }
}
