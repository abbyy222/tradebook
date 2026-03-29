// src/db/index.ts
// Dexie wraps IndexedDB with a clean, promise-based API.
// Think of this as the trader's local database - everything
// written here works instantly with no network needed.
//
// The sync flow:
// 1. Trader records a sale -> written to Dexie immediately (instant)
// 2. UI updates from Dexie immediately (no loading spinner)
// 3. Background sync worker reads PENDING records from Dexie
// 4. Sends them to the backend API
// 5. Marks them SYNCED in Dexie
//
// The trader never waits for the network. The app always feels fast.

import Dexie, { type EntityTable } from 'dexie'
import type {
  SaleDTO,
  ExpenseDTO,
  StockItemDTO,
  DebtorDTO,
  TraderDTO,
} from '@tradebook/shared-types'

// We extend the DTOs with a local syncStatus field.
// The server DTOs don't have this - it's a client-only concern.
export interface LocalSale extends Omit<SaleDTO, 'syncStatus'> {
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalExpense extends Omit<ExpenseDTO, 'syncStatus'> {
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalStockItem extends Omit<StockItemDTO, 'syncStatus'> {
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalStockAdjustment {
  id: string
  stockItemId: string
  delta: number
  reason: 'restock' | 'sale_adjustment' | 'damage' | 'correction'
  createdAt: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface LocalDebtor extends DebtorDTO {
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  updatedAt: string
}

export interface LocalDebtorPayment {
  id: string
  debtorId: string
  amount: number
  paidAt: string
  note?: string
  createdAt: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
}

// Dexie class defines the database structure and indexes.
// The indexes after the ++ or & mirror the backend indexes
// we defined in Prisma - same query patterns, same performance.
class TradeBookDB extends Dexie {
  sales!: EntityTable<LocalSale, 'id'>
  expenses!: EntityTable<LocalExpense, 'id'>
  stockItems!: EntityTable<LocalStockItem, 'id'>
  stockAdjustments!: EntityTable<LocalStockAdjustment, 'id'>
  debtors!: EntityTable<LocalDebtor, 'id'>
  debtorPayments!: EntityTable<LocalDebtorPayment, 'id'>
  trader!: EntityTable<TraderDTO & { id: string }, 'id'>

  constructor() {
    super('TradeBookDB')

    this.version(4).stores({
      // The string after the table name defines the indexes.
      // &id = primary key, unique
      // syncStatus = index for querying pending records
      // soldAt = index for date-range queries
      // [traderId+soldAt] = compound index (mirrors the backend)
      sales: '&id, syncStatus, soldAt, paymentType',
      expenses: '&id, syncStatus, spentAt, category',
      stockItems: '&id, syncStatus, itemName',
      stockAdjustments: '&id, stockItemId, syncStatus, createdAt, reason',
      debtors: '&id, syncStatus, status, customerName, createdAt',
      debtorPayments: '&id, debtorId, syncStatus, createdAt, paidAt',
      trader: '&id',
    })
  }
}

// Single instance - same singleton pattern as the backend Prisma client.
// One database connection shared across the entire frontend.
export const db = new TradeBookDB()
