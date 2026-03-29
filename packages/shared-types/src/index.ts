// packages/shared-types/src/index.ts
// These types are shared between frontend and backend.
// Change a DTO here and TypeScript tells you everywhere that breaks —
// in the API handler AND in the React component. Zero runtime surprises.

// --- Auth DTOs ---
export interface RegisterDTO {
  phoneNumber: string
  name: string
  pin: string
  language?: 'EN' | 'PIDGIN' | 'IGBO' | 'YORUBA' | 'HAUSA'
  businessName?: string
}

export interface LoginDTO {
  phoneNumber: string
  pin: string
}

export interface AuthResponseDTO {
  token: string
  trader: TraderDTO
}

// --- Trader ---
export interface TraderDTO {
  id: string
  phoneNumber: string
  name: string
  businessName?: string
  language: string
  createdAt: string
}

// --- Sale DTOs ---
export interface CreateSaleDTO {
  id: string           // UUID generated on the CLIENT before syncing
  itemName: string
  amount: number
  paymentType: 'CASH' | 'TRANSFER' | 'DEBT'
  debtorId?: string
  soldAt: string       // ISO timestamp — when it actually happened
}

export interface SaleDTO {
  id: string
  itemName: string
  amount: number
  paymentType: 'CASH' | 'TRANSFER' | 'DEBT'
  debtorId?: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  soldAt: string
  createdAt: string
}

// --- Expense DTOs ---
export interface CreateExpenseDTO {
  id: string
  description: string
  amount: number
  category: string
  spentAt: string
}

export interface ExpenseDTO {
  id: string
  description: string
  amount: number
  category: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  spentAt: string
  createdAt: string
}

// --- Stock DTOs ---
export interface CreateStockItemDTO {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  lowStockThreshold?: number
}

export interface StockItemDTO {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  lowStockThreshold: number
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  updatedAt: string
}

// --- Debtor DTOs ---
export interface CreateDebtorDTO {
  id: string
  customerName: string
  phoneNumber?: string
  totalOwed: number
  dueDate?: string
}

export interface DebtorDTO {
  id: string
  customerName: string
  phoneNumber?: string
  totalOwed: number
  totalPaid: number
  balance: number      // computed: totalOwed - totalPaid
  status: 'ACTIVE' | 'PARTIAL' | 'CLEARED'
  dueDate?: string
  createdAt: string
}

export interface RecordPaymentDTO {
  amount: number
  paidAt: string
  note?: string
}

// --- API response wrapper ---
// Every API response has the same shape. This is the envelope pattern.
// The frontend always knows: { data, error, meta }
// It never has to guess the response shape.
export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code: string
  }
}

// --- Pagination ---
// We ALWAYS paginate list endpoints. Never return all records.
// 1 trader with 5,000 sales records — returning all at once
// would be slow, memory-intensive, and crash old phones.
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  error: null
}

// Cursor pagination is better for infinite scroll feeds like sales/debtors.
// The client asks for "items after this cursor" instead of "page 5",
// which scales better as the dataset grows.
export interface CursorPaginatedResponse<T> {
  data: T[]
  meta: {
    nextCursor: string | null
    hasNextPage: boolean
    pageSize: number
  }
  error: null
}
