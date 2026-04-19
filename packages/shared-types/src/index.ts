// packages/shared-types/src/index.ts
// These types are shared between frontend and backend.
// Change a DTO here and TypeScript tells you everywhere that breaks -
// in the API handler AND in the React component. Zero runtime surprises.

export const EXPENSE_CATEGORIES = [
  'RESTOCK',
  'TRANSPORT',
  'MARKET_FEES',
  'PACKAGING',
  'EQUIPMENT',
  'FOOD',
  'RENT',
  'ELECTRICITY',
  'WATER',
  'SALARY',
  'LEVY',
  'REPAIRS',
  'UTILITIES',
  'OTHER',
] as const

export const EXPENSE_TYPES = ['ONE_TIME', 'RECURRING'] as const
export const EXPENSE_FREQUENCIES = ['DAILY', 'MONTHLY', 'YEARLY'] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type ExpenseType = (typeof EXPENSE_TYPES)[number]
export type ExpenseFrequency = (typeof EXPENSE_FREQUENCIES)[number]

export const PROFIT_LOSS_PERIODS = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'ALL_TIME'] as const
export type ProfitLossPeriod = (typeof PROFIT_LOSS_PERIODS)[number]

export interface ProfitLossSummaryDTO {
  period: ProfitLossPeriod
  revenue: number
  expenseTotal: number
  operatingProfit: number
  inventoryValue: number
  retailValue: number
  expectedMarginOnHand: number
  receivablesTotal: number
  salesCount: number
  expenseCount: number
  unitsOnHand: number
  activeDebtorsCount: number
}

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

export interface CreateSalespersonDTO {
  phoneNumber: string
  name: string
  pin: string
  language?: 'EN' | 'PIDGIN' | 'IGBO' | 'YORUBA' | 'HAUSA'
}

export interface AuthResponseDTO {
  token: string
  trader: TraderDTO
}

export interface TraderDTO {
  id: string
  phoneNumber: string
  name: string
  businessName?: string
  role: 'OWNER' | 'SALESPERSON'
  language: string
  createdAt: string
}

export interface CreateSaleDTO {
  id: string
  itemName: string
  stockItemId?: string
  quantity: number
  unitPrice: number
  amount: number
  paymentType: 'CASH' | 'TRANSFER' | 'DEBT'
  debtorId?: string
  soldAt: string
}

export interface SaleDTO {
  id: string
  itemName: string
  stockItemId?: string
  quantity: number
  unitPrice: number
  amount: number
  paymentType: 'CASH' | 'TRANSFER' | 'DEBT'
  debtorId?: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  soldAt: string
  createdAt: string
}

export interface CreateExpenseDTO {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  expenseType: ExpenseType
  frequency?: ExpenseFrequency
  note?: string
  spentAt: string
  startDate?: string
  endDate?: string
  nextDueDate?: string
}

export interface ExpenseDTO {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  expenseType: ExpenseType
  frequency?: ExpenseFrequency
  note?: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  spentAt: string
  startDate?: string
  endDate?: string
  nextDueDate?: string
  createdAt: string
}

export interface CreateStockItemDTO {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  costPrice: number
  lowStockThreshold?: number
}

export interface StockItemDTO {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  costPrice: number
  stockValue: number
  retailValue: number
  expectedGrossProfit: number
  lowStockThreshold: number
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  updatedAt: string
}

export interface CreateDebtorDTO {
  id: string
  customerName: string
  phoneNumber?: string
  totalOwed: number
  dueDate?: string
}

export interface UpdateDebtorScheduleDTO {
  dueDate: string | null
}

export interface DebtorDTO {
  id: string
  customerName: string
  phoneNumber?: string
  totalOwed: number
  totalPaid: number
  balance: number
  status: 'ACTIVE' | 'PARTIAL' | 'CLEARED'
  dueDate?: string | null
  createdAt: string
}

export interface RecordPaymentDTO {
  amount: number
  paidAt: string
  note?: string
}

export interface DebtorStatementEntryDTO {
  id: string
  type: 'SALE' | 'PAYMENT'
  amount: number
  date: string
  note?: string
  reference?: string
  balanceAfter: number
}

export interface DebtorStatementDTO {
  debtor: DebtorDTO
  generatedAt: string
  entries: DebtorStatementEntryDTO[]
  totals: {
    totalSalesOnCredit: number
    totalPayments: number
    balance: number
  }
}

export interface CreateSavingsEntryDTO {
  id: string
  amount: number
  savedAt: string
  note?: string
}

export interface SavingsEntryDTO {
  id: string
  amount: number
  savedAt: string
  note?: string
  createdByTraderId: string
  createdAt: string
}

export interface CreateCustomerDTO {
  id: string
  name: string
  phoneNumber?: string
  note?: string
}

export interface CustomerDTO {
  id: string
  name: string
  phoneNumber?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateCustomerDTO {
  name?: string
  phoneNumber?: string
  note?: string
}

export interface CreateSupplierDTO {
  id: string
  name: string
  phoneNumber?: string
  itemCategory?: string
  note?: string
}

export interface SupplierDTO {
  id: string
  name: string
  phoneNumber?: string
  itemCategory?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateSupplierDTO {
  name?: string
  phoneNumber?: string
  itemCategory?: string
  note?: string
}

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

export interface CursorPaginatedResponse<T> {
  data: T[]
  meta: {
    nextCursor: string | null
    hasNextPage: boolean
    pageSize: number
  }
  error: null
}

export interface FeatureUsagePointDTO {
  feature: 'Sales' | 'Expenses' | 'Debtors' | 'Savings'
  count: number
}

export interface ActivityTrendPointDTO {
  date: string
  salesCount: number
  expensesCount: number
  debtorsCount: number
  savingsCount: number
}

export interface BusinessInsightsDTO {
  period: {
    days: number
    from: string
    to: string
  }
  overview: {
    teamSize: number
    activeDebtors: number
    customers: number
    suppliers: number
    stockItems: number
    transactionsRecorded: number
    salesAmount: number
    expensesAmount: number
    operatingProfit: number
  }
  featureUsage: FeatureUsagePointDTO[]
  syncHealth: {
    pending: number
    failed: number
  }
  activityTrend: ActivityTrendPointDTO[]
}

export interface EndpointLatencyStatDTO {
  endpoint: string
  avgDurationMs: number
  maxDurationMs: number
  requests: number
}

export interface EndpointErrorStatDTO {
  endpoint: string
  errors: number
}

export interface DeveloperInsightsDTO {
  uptimeSeconds: number
  requestsLastHour: number
  serverErrorsLastHour: number
  errorRatePercent: number
  avgResponseMs: number
  p95ResponseMs: number
  topSlowEndpoints: EndpointLatencyStatDTO[]
  topErrorEndpoints: EndpointErrorStatDTO[]
  process: {
    rssMb: number
    heapUsedMb: number
  }
  database: {
    ok: boolean
    latencyMs: number | null
  }
}

export type InternalRole = 'PLATFORM_ADMIN' | 'PLATFORM_DEV'
export type InternalPortal = 'ADMIN' | 'DEVELOPER'

export interface InternalUserDTO {
  id: string
  phoneNumber: string
  fullName: string
  role: InternalRole
  isActive: boolean
  createdAt: string
}

export interface InternalAuthResponseDTO {
  token: string
  user: InternalUserDTO
  portal: InternalPortal
}

export interface InternalLoginDTO {
  phoneNumber: string
  password: string
  portal: InternalPortal
}

export interface CreatePlatformAdminDTO {
  phoneNumber: string
  fullName: string
  password: string
}

export interface PlatformDailyActivityDTO {
  date: string
  salesCount: number
  expensesCount: number
}

export interface PlatformModuleUsageDTO {
  module: 'Sales' | 'Expenses' | 'Debtors' | 'Stock' | 'Savings'
  count: number
}

export interface PlatformBusinessDTO {
  id: string
  label: string
  createdAt: string
}

export interface PlatformAdminOverviewDTO {
  period: {
    days: number
    from: string
    to: string
  }
  overview: {
    totalBusinesses: number
    totalSalespeople: number
    activeBusinesses: number
    totalInternalAdmins: number
    totalPlatformDevelopers: number
    transactionsRecorded: number
    salesAmount: number
    expensesAmount: number
    netFlow: number
  }
  operations: {
    syncPending: number
    syncFailed: number
    overdueDebtors: number
    recurringDueSoon: number
  }
  modulesUsage: PlatformModuleUsageDTO[]
  dailyActivity: PlatformDailyActivityDTO[]
  recentBusinesses: PlatformBusinessDTO[]
}

export type PlatformBusinessActivityStatus = 'ACTIVE' | 'DORMANT' | 'INACTIVE' | 'NEW'
export type PlatformBusinessAccountStatus = 'ACTIVE' | 'SUSPENDED'

export interface PlatformBusinessDirectoryItemDTO {
  id: string
  label: string
  ownerName: string
  phoneNumber: string
  createdAt: string
  lastActivityAt: string | null
  salespeopleCount: number
  salesCount: number
  salesAmount: number
  expensesAmount: number
  receivablesAmount: number
  activityStatus: PlatformBusinessActivityStatus
  accountStatus: PlatformBusinessAccountStatus
  suspensionReason: string | null
  suspensionUpdatedAt: string | null
}

export interface PlatformBusinessesDirectoryDTO {
  items: PlatformBusinessDirectoryItemDTO[]
  summary: {
    active: number
    dormant: number
    inactive: number
    newlyOnboarded: number
  }
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface PlatformBusinessStatusUpdateDTO {
  accountStatus: PlatformBusinessAccountStatus
  reason: string
}

export interface PlatformBusinessActionLogItemDTO {
  id: string
  traderId: string
  actionType: string
  reason: string
  accountStatus: PlatformBusinessAccountStatus
  actorName: string | null
  actorPhone: string | null
  createdAt: string
}

export interface PlatformBusinessActionLogsDTO {
  items: PlatformBusinessActionLogItemDTO[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface PlatformDevOverviewDTO {
  uptimeSeconds: number
  requestsLastHour: number
  serverErrorsLastHour: number
  errorRatePercent: number
  avgResponseMs: number
  p95ResponseMs: number
  topSlowEndpoints: EndpointLatencyStatDTO[]
  topErrorEndpoints: EndpointErrorStatDTO[]
  process: {
    rssMb: number
    heapUsedMb: number
  }
  database: {
    ok: boolean
    latencyMs: number | null
  }
  internalAccess: {
    admins: number
    developers: number
  }
}

export interface PlatformDevErrorEventDTO {
  requestId: string
  endpoint: string
  status: number
  durationMs: number
  at: string
}

export interface PlatformDevRequestTraceDTO {
  requestId: string
  method: string
  path: string
  url: string
  status: number
  durationMs: number
  ip: string
  at: string
}

export interface PlatformDevSyncHealthDTO {
  totals: {
    pending: number
    failed: number
    salesPending: number
    salesFailed: number
    expensesPending: number
    expensesFailed: number
    stockPending: number
    stockFailed: number
  }
  operationalRisks: {
    recurringDueSoon: number
    overdueDebtors: number
  }
  topFailedBusinesses: Array<{
    traderId: string
    label: string
    failedRecords: number
  }>
}

export type PlatformModuleKey =
  | 'SALES'
  | 'EXPENSES'
  | 'STOCK'
  | 'DEBTORS'
  | 'SAVINGS'
  | 'SUPPLIERS'
  | 'CUSTOMERS'

export interface PlatformKillSwitchDTO {
  module: PlatformModuleKey
  enabled: boolean
}

export interface PlatformDeadLetterRecordDTO {
  module: PlatformModuleKey
  recordId: string
  traderId: string
  businessLabel: string
  amount: number | null
  happenedAt: string
}

export interface PlatformTenantRiskDTO {
  traderId: string
  businessLabel: string
  pendingRecords: number
  failedRecords: number
  overdueDebtors: number
  recurringDueSoon: number
  riskScore: number
}

export interface PlatformForceResyncResultDTO {
  traderId: string | null
  totalRequeued: number
  results: Array<{
    module: PlatformModuleKey
    requeued: number
  }>
}
