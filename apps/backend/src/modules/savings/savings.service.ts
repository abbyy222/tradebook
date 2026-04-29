import { AppError } from '../../middleware/errorHandler'
import { env } from '../../config/env'
import { savingsRepository } from './savings.repository'
import {
  ConfirmSavingsVerificationInput,
  CreateSavingsEntryInput,
  ListSavingsEntriesQuery,
  UpdateSavingsAccountInput,
  UpdateSavingsEntryInput,
  UpdateSavingsTargetInput,
} from './savings.schema'
import {
  initiateSavingsPayoutTransfer,
  listSavingsPayoutBanks,
  resolveSavingsPayoutAccount,
} from '../../utils/savingsPayoutGateway'
import { verifyFlutterwaveTransactionByReference } from '../../utils/flutterwave'

const LAGOS_OFFSET_MS = 60 * 60 * 1000
const FLUTTERWAVE_VERIFY_ATTEMPTS = 6
const FLUTTERWAVE_VERIFY_DELAY_MS = 2000

const toSavingsEntryDTO = (entry: any) => ({
  ...entry,
  amount: Number(entry.amount),
  reconciledAt: entry.reconciledAt ? entry.reconciledAt.toISOString() : null,
  verifiedAt: entry.verifiedAt ? entry.verifiedAt.toISOString() : null,
  savedAt: entry.savedAt.toISOString(),
  createdAt: entry.createdAt.toISOString(),
})

const toSavingsAccountDTO = (account: {
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  setupAt: Date
}) => ({
  bankName: account.bankName,
  bankCode: account.bankCode,
  accountNumber: account.accountNumber,
  accountName: account.accountName,
  setupAt: account.setupAt.toISOString(),
})

const toLagosDayKey = (date: Date) => {
  const lagosDate = new Date(date.getTime() + LAGOS_OFFSET_MS)
  return `${lagosDate.getUTCFullYear()}-${String(lagosDate.getUTCMonth() + 1).padStart(2, '0')}-${String(lagosDate.getUTCDate()).padStart(2, '0')}`
}

const getTodayRangeInLagos = () => {
  const now = new Date()
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  lagosNow.setUTCHours(0, 0, 0, 0)
  const from = new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
  const to = new Date(from.getTime() + (24 * 60 * 60 * 1000) - 1)
  return { from, to }
}

const getDayRangeInLagos = (date: Date) => {
  const lagosDate = new Date(date.getTime() + LAGOS_OFFSET_MS)
  lagosDate.setUTCHours(0, 0, 0, 0)
  const from = new Date(lagosDate.getTime() - LAGOS_OFFSET_MS)
  const to = new Date(from.getTime() + (24 * 60 * 60 * 1000) - 1)
  return { from, to }
}

const getWeekRangeInLagos = () => {
  const now = new Date()
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  const day = lagosNow.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  lagosNow.setUTCDate(lagosNow.getUTCDate() - offset)
  lagosNow.setUTCHours(0, 0, 0, 0)
  const from = new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
  const to = new Date(from.getTime() + (7 * 24 * 60 * 60 * 1000) - 1)
  return { from, to }
}

const getMonthRangeInLagos = () => {
  const now = new Date()
  const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS)
  lagosNow.setUTCDate(1)
  lagosNow.setUTCHours(0, 0, 0, 0)
  const from = new Date(lagosNow.getTime() - LAGOS_OFFSET_MS)
  const nextMonth = new Date(lagosNow)
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
  const to = new Date(nextMonth.getTime() - LAGOS_OFFSET_MS - 1)
  return { from, to }
}

const getTargetWindow = (period: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
  if (period === 'DAILY') {
    const { from, to } = getTodayRangeInLagos()
    return { label: 'Today' as const, from, to }
  }

  if (period === 'WEEKLY') {
    const { from, to } = getWeekRangeInLagos()
    return { label: 'This week' as const, from, to }
  }

  const { from, to } = getMonthRangeInLagos()
  return { label: 'This month' as const, from, to }
}

const assertSalespersonCanWriteDate = (role: 'OWNER' | 'SALESPERSON', savedAt: string) => {
  if (role !== 'SALESPERSON') return

  const requested = new Date(savedAt)
  if (Number.isNaN(requested.getTime())) {
    throw new AppError('Invalid savings date', 400, 'BAD_REQUEST')
  }

  const requestedKey = toLagosDayKey(requested)
  const todayKey = toLagosDayKey(new Date())

  if (requestedKey !== todayKey) {
    throw new AppError('Salesperson can only record savings for today', 403, 'FORBIDDEN')
  }
}

const getSavingsStatusForAmount = async (
  traderId: string,
  amount: number,
  savedAt: string,
  excludeSavingsEntryId?: string,
) => {
  const savedAtDate = new Date(savedAt)
  const { from, to } = getDayRangeInLagos(savedAtDate)
  const inputs = await savingsRepository.getReconciliationInputs(
    traderId,
    from,
    to,
    excludeSavingsEntryId,
  )

  const availableToSave = Math.max(
    inputs.inflowTotal - inputs.expenseTotal - inputs.savingsAlreadyRecorded,
    0,
  )

  return amount <= availableToSave ? 'RECONCILED' as const : 'DECLARED' as const
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const verifyCheckoutPaymentWithRetry = async (txRef: string) => {
  let lastVerifiedPayment: Awaited<ReturnType<typeof verifyFlutterwaveTransactionByReference>> | null = null

  for (let attempt = 0; attempt < FLUTTERWAVE_VERIFY_ATTEMPTS; attempt += 1) {
    lastVerifiedPayment = await verifyFlutterwaveTransactionByReference(txRef)
    const normalizedStatus = lastVerifiedPayment.status.toLowerCase()

    if (normalizedStatus === 'successful' || normalizedStatus === 'completed') {
      return lastVerifiedPayment
    }

    if (attempt < FLUTTERWAVE_VERIFY_ATTEMPTS - 1) {
      await sleep(FLUTTERWAVE_VERIFY_DELAY_MS)
    }
  }

  return lastVerifiedPayment
}

export const savingsService = {
  async listBanks() {
    const banks = await listSavingsPayoutBanks()
    return banks
      .filter((bank) => bank.code && bank.name)
      .map((bank) => ({
        id: bank.id,
        code: bank.code,
        name: bank.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  async resolveSavingsAccount(input: { bankCode: string; accountNumber: string }) {
    const accountName = await resolveSavingsPayoutAccount(input.accountNumber, input.bankCode)
    return { accountName }
  },

  async createOrSync(
    traderId: string,
    actorId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: CreateSavingsEntryInput
  ) {
    assertSalespersonCanWriteDate(role, input.savedAt)
    const status = await getSavingsStatusForAmount(traderId, input.amount, input.savedAt, input.id)
    const entry = await savingsRepository.upsert(traderId, actorId, input, status)
    return toSavingsEntryDTO(entry)
  },

  async list(traderId: string, query: ListSavingsEntriesQuery) {
    const result = await savingsRepository.findMany(traderId, query)
    return {
      data: result.entries.map(toSavingsEntryDTO),
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        pageSize: query.pageSize,
      },
      error: null,
    }
  },

  async summaryToday(traderId: string) {
    const { from, to } = getTodayRangeInLagos()
    const total = await savingsRepository.getTodayTotal(traderId, from, to)
    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      total,
    }
  },

  async getTargetProgress(traderId: string) {
    const target = await savingsRepository.getSavingsTarget(traderId)
    if (!target) {
      return {
        target: null,
        currentSaved: 0,
        remaining: 0,
        progressPercent: 0,
        isCompleted: false,
        period: null,
      }
    }

    const window = getTargetWindow(target.period)
    const currentSaved = await savingsRepository.getTotalForPeriod(traderId, window.from, window.to)
    const remaining = Math.max(target.amount - currentSaved, 0)
    const progressPercent = target.amount > 0
      ? Math.min(Math.round((currentSaved / target.amount) * 1000) / 10, 100)
      : 0

    return {
      target: {
        amount: target.amount,
        period: target.period,
        updatedAt: target.updatedAt.toISOString(),
      },
      currentSaved,
      remaining,
      progressPercent,
      isCompleted: currentSaved >= target.amount,
      period: {
        label: window.label,
        from: window.from.toISOString(),
        to: window.to.toISOString(),
      },
    }
  },

  async updateTarget(
    traderId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: UpdateSavingsTargetInput,
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can update savings target', 403, 'FORBIDDEN')
    }

    const target = await savingsRepository.updateSavingsTarget(traderId, input)
    if (!target) {
      throw new AppError('Savings target could not be updated', 500, 'INTERNAL_ERROR')
    }

    return {
      amount: target.amount,
      period: target.period,
      updatedAt: target.updatedAt.toISOString(),
    }
  },

  async getSavingsAccount(traderId: string) {
    const account = await savingsRepository.getSavingsAccount(traderId)
    if (!account?.bankName || !account.bankCode || !account.accountNumber || !account.accountName || !account.setupAt) {
      return null
    }

    return toSavingsAccountDTO({
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      setupAt: account.setupAt,
    })
  },

  async updateSavingsAccount(
    traderId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: UpdateSavingsAccountInput,
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can update savings account', 403, 'FORBIDDEN')
    }

    const account = await savingsRepository.upsertSavingsAccount(traderId, input)
    if (!account?.bankName || !account.bankCode || !account.accountNumber || !account.accountName || !account.setupAt) {
      throw new AppError('Savings account could not be updated', 500, 'INTERNAL_ERROR')
    }

    return toSavingsAccountDTO({
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      setupAt: account.setupAt,
    })
  },

  async getVerificationPreview(
    id: string,
    traderId: string,
    role: 'OWNER' | 'SALESPERSON',
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can verify savings entries', 403, 'FORBIDDEN')
    }

    const entry = await savingsRepository.findById(id, traderId)
    if (!entry) {
      throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    }

    const account = await savingsRepository.getSavingsAccount(traderId)
    if (!account?.bankName || !account.bankCode || !account.accountNumber || !account.accountName || !account.setupAt) {
      throw new AppError('Set up a savings account before verifying entries', 400, 'SAVINGS_ACCOUNT_REQUIRED')
    }

    const entryDto = toSavingsEntryDTO(entry)
    const destination = toSavingsAccountDTO({
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      setupAt: account.setupAt,
    })

    return {
      entry: entryDto,
      destination,
      canProceed: entry.status !== 'VERIFIED',
      mode: 'PREVIEW' as const,
      message: entry.status === 'VERIFIED'
        ? 'This savings entry has already been verified.'
        : 'Verification review is ready. You can now start the transfer when you are satisfied with the destination account.',
    }
  },

  async initiateVerification(
    id: string,
    traderId: string,
    role: 'OWNER' | 'SALESPERSON',
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can verify savings entries', 403, 'FORBIDDEN')
    }

    const entry = await savingsRepository.findById(id, traderId)
    if (!entry) {
      throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    }

    if (entry.status === 'VERIFIED') {
      throw new AppError('This savings entry has already been verified', 400, 'ALREADY_VERIFIED')
    }

    const account = await savingsRepository.getSavingsAccount(traderId)
    if (!account?.bankName || !account.bankCode || !account.accountNumber || !account.accountName) {
      throw new AppError('Update the savings account with a verified bank code before initiating transfer', 400, 'SAVINGS_ACCOUNT_REQUIRED')
    }

    if (!env.BACKEND_PUBLIC_URL) {
      throw new AppError('BACKEND_PUBLIC_URL is required before initiating savings verification', 500, 'BACKEND_URL_MISSING')
    }

    const reference = `sv_${entry.id.replace(/-/g, '').slice(0, 20)}_${Date.now()}`
    const callbackUrl = `${env.BACKEND_PUBLIC_URL.replace(/\/+$/, '')}/api/v1/savings/flutterwave/webhook`
    const transfer = await initiateSavingsPayoutTransfer({
      accountBank: account.bankCode,
      accountNumber: account.accountNumber,
      beneficiaryName: account.accountName,
      bankName: account.bankName,
      amount: Number(entry.amount),
      reference,
      callbackUrl,
      narration: `TradeBook savings verification for ${entry.id}`,
    })

    await savingsRepository.markVerificationInitiated(id, traderId, {
      reference: transfer.reference,
      transferId: transfer.transferId,
      status: transfer.status,
    })

    const updated = await savingsRepository.findById(id, traderId)
    if (!updated) {
      throw new AppError('Savings entry not found after initiating verification', 404, 'NOT_FOUND')
    }

    return {
      entry: toSavingsEntryDTO(updated),
      reference: transfer.reference,
      transferId: transfer.transferId,
      status: 'PENDING' as const,
      message: 'Transfer initiated. TradeBook will mark this entry verified when Flutterwave confirms the payout.',
    }
  },

  async confirmCheckoutVerification(
    id: string,
    traderId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: ConfirmSavingsVerificationInput,
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can verify savings entries', 403, 'FORBIDDEN')
    }

    const entry = await savingsRepository.findById(id, traderId)
    if (!entry) {
      throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    }

    if (entry.status === 'VERIFIED') {
      return {
        verified: true as const,
        reference: input.txRef,
        entry: toSavingsEntryDTO(entry),
        message: 'This savings entry is already verified.',
      }
    }

    const verifiedPayment = await verifyCheckoutPaymentWithRetry(input.txRef)
    if (!verifiedPayment) {
      throw new AppError('Could not verify Flutterwave payment right now', 500, 'PAYMENT_VERIFY_RETRY_FAILED')
    }

    const normalizedStatus = verifiedPayment?.status?.toLowerCase() ?? 'unknown'
    if (normalizedStatus !== 'successful' && normalizedStatus !== 'completed') {
      throw new AppError('Flutterwave payment is not successful yet', 400, 'PAYMENT_NOT_SUCCESSFUL')
    }

    if (verifiedPayment.currency.toUpperCase() !== 'NGN') {
      throw new AppError('Flutterwave payment currency did not match NGN', 400, 'PAYMENT_CURRENCY_MISMATCH')
    }

    const expectedAmount = Number(entry.amount)
    if (Math.abs(verifiedPayment.amount - expectedAmount) > 0.009) {
      throw new AppError('Flutterwave payment amount did not match the savings entry', 400, 'PAYMENT_AMOUNT_MISMATCH')
    }

    await savingsRepository.markVerificationInitiated(id, traderId, {
      reference: input.txRef,
      transferId: input.transactionId ?? verifiedPayment.transactionId,
      status: 'SUCCESSFUL',
    })
    await savingsRepository.markVerifiedByReference(
      input.txRef,
      input.transactionId ?? verifiedPayment.transactionId,
      'SUCCESSFUL',
    )

    const updated = await savingsRepository.findById(id, traderId)
    if (!updated) {
      throw new AppError('Savings entry not found after payment verification', 404, 'NOT_FOUND')
    }

    return {
      verified: true as const,
      reference: input.txRef,
      entry: toSavingsEntryDTO(updated),
      message: 'Savings payment verified successfully.',
    }
  },

  async handleFlutterwaveWebhook(
    payload: any,
    providedSecret?: string | null,
  ) {
    if (!env.FLW_WEBHOOK_SECRET) {
      throw new AppError('Flutterwave webhook secret is missing in backend environment', 500, 'FLW_NOT_CONFIGURED')
    }

    if (!providedSecret || providedSecret !== env.FLW_WEBHOOK_SECRET) {
      throw new AppError('Invalid Flutterwave webhook signature', 401, 'INVALID_WEBHOOK_SIGNATURE')
    }

    const reference = payload?.data?.reference
    const transferId = payload?.data?.id ? String(payload.data.id) : null
    const status = String(payload?.data?.status ?? payload?.status ?? 'UNKNOWN').toUpperCase()

    if (!reference) {
      return { accepted: true, updated: false }
    }

    if (status === 'SUCCESSFUL' || status === 'SUCCESS') {
      await savingsRepository.markVerifiedByReference(reference, transferId, status)
      return { accepted: true, updated: true }
    }

    await savingsRepository.markVerificationStatusByReference(reference, transferId, status)
    return { accepted: true, updated: true }
  },

  async handleGatewayCallback(
    payload: {
      reference?: string
      transferId?: string | null
      status?: string
    },
    providedSecret?: string | null,
  ) {
    if (!env.SAVINGS_PAYOUT_CALLBACK_SECRET) {
      throw new AppError('Savings payout callback secret is missing in backend environment', 500, 'PAYOUT_CALLBACK_NOT_CONFIGURED')
    }

    if (!providedSecret || providedSecret !== env.SAVINGS_PAYOUT_CALLBACK_SECRET) {
      throw new AppError('Invalid savings payout callback signature', 401, 'INVALID_PAYOUT_CALLBACK_SIGNATURE')
    }

    const reference = payload.reference?.trim()
    const transferId = payload.transferId ? String(payload.transferId) : null
    const status = String(payload.status ?? 'UNKNOWN').toUpperCase()

    if (!reference) {
      return { accepted: true, updated: false }
    }

    if (status === 'SUCCESSFUL' || status === 'SUCCESS' || status === 'COMPLETED') {
      await savingsRepository.markVerifiedByReference(reference, transferId, status)
      return { accepted: true, updated: true }
    }

    await savingsRepository.markVerificationStatusByReference(reference, transferId, status)
    return { accepted: true, updated: true }
  },

  async update(
    id: string,
    traderId: string,
    role: 'OWNER' | 'SALESPERSON',
    input: UpdateSavingsEntryInput
  ) {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can edit savings records', 403, 'FORBIDDEN')
    }

    const status = await getSavingsStatusForAmount(traderId, input.amount, input.savedAt, id)
    const result = await savingsRepository.update(id, traderId, input, status)
    if (result.count === 0) throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    return { updated: true }
  },

  async remove(id: string, traderId: string, role: 'OWNER' | 'SALESPERSON') {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can delete savings records', 403, 'FORBIDDEN')
    }

    const result = await savingsRepository.delete(id, traderId)
    if (result.count === 0) throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    return { deleted: true }
  },
}
