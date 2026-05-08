import { AppError } from '../../middleware/errorHandler'
import { savingsRepository } from './savings.repository'
import { logger } from '../../utils/logger'
import {
  ConfirmSavingsVerificationInput,
  CreateSavingsEntryInput,
  ListSavingsEntriesQuery,
  UpdateSavingsAccountInput,
  UpdateSavingsEntryInput,
  UpdateSavingsTargetInput,
} from './savings.schema'
import {
  initializeSavingsPayment,
  initiateSavingsPayoutTransfer,
  listSavingsPayoutBanks,
  resolveSavingsPayoutAccount,
  verifySavingsPaymentByReference,
} from '../../utils/savingsPayoutGateway'
import {
  verifyPaystackWebhookSignature,
} from '../../utils/paystack'
import { authRepository } from '../auth/auth.repository'
import { env } from '../../config/env'

const LAGOS_OFFSET_MS = 60 * 60 * 1000
const PAYMENT_ATTEMPT_TTL_MS = 30 * 60 * 1000

const getPayoutGatewayWebhookUrl = () => {
  const baseUrl = process.env.SAVINGS_PAYOUT_SERVICE_URL?.trim()
  if (baseUrl) {
    return new URL('/api/v1/flutterwave/webhook', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
  }

  return process.env.FLW_WEBHOOK_URL?.trim() || `${process.env.BACKEND_PUBLIC_URL ?? ''}/api/v1/savings/flutterwave/webhook`
}

const toSavingsEntryDTO = (entry: any) => ({
  ...entry,
  amount: Number(entry.amount),
  reconciledAt: entry.reconciledAt ? entry.reconciledAt.toISOString() : null,
  verifiedAt: entry.verifiedAt ? entry.verifiedAt.toISOString() : null,
  payoutTransferredAt: entry.payoutTransferredAt ? entry.payoutTransferredAt.toISOString() : null,
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

const toVerificationAttemptDTO = (attempt: {
  reference: string
  expectedAmount: number | { toString(): string }
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'
  authorizationUrl: string
  accessCode: string | null
  paystackEmail: string
  paystackTransactionId: string | null
  paystackReference: string | null
  expiresAt: Date | null
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) => ({
  reference: attempt.reference,
  expectedAmount: Number(attempt.expectedAmount),
  status: attempt.status,
  paymentUrl: attempt.authorizationUrl,
  accessCode: attempt.accessCode,
  paystackEmail: attempt.paystackEmail,
  paystackTransactionId: attempt.paystackTransactionId,
  paystackReference: attempt.paystackReference,
  expiresAt: attempt.expiresAt ? attempt.expiresAt.toISOString() : null,
  verifiedAt: attempt.verifiedAt ? attempt.verifiedAt.toISOString() : null,
  createdAt: attempt.createdAt.toISOString(),
  updatedAt: attempt.updatedAt.toISOString(),
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
  const inputs = await savingsRepository.getReconciliationInputs(traderId, from, to, excludeSavingsEntryId)
  const availableToSave = Math.max(inputs.inflowTotal - inputs.expenseTotal - inputs.savingsAlreadyRecorded, 0)
  return amount <= availableToSave ? 'RECONCILED' as const : 'DECLARED' as const
}

const buildPaymentCustomerForTrader = async (traderId: string) => {
  const trader = await authRepository.findById(traderId)
  if (!trader) {
    throw new AppError('Trader not found for savings verification', 404, 'NOT_FOUND')
  }

  const emailSeed = (trader.phoneNumber || trader.id).replace(/\D/g, '') || trader.id.replace(/-/g, '')
  return {
    trader,
    email: `${emailSeed}@tradebookapp.com`,
    name: trader.businessName ?? trader.name ?? 'TradeBook Trader',
  }
}

const getPayoutDestination = async (traderId: string) => {
  const destination = await savingsRepository.getSavingsAccount(traderId)
  if (!destination?.bankName || !destination.bankCode || !destination.accountNumber || !destination.accountName) {
    throw new AppError('Savings payout account is not set up yet', 400, 'SAVINGS_ACCOUNT_REQUIRED')
  }

  return {
    bankName: destination.bankName,
    bankCode: destination.bankCode,
    accountNumber: destination.accountNumber,
    accountName: destination.accountName,
  }
}

const maybeInitiatePayoutForEntry = async (entryId: string, traderId: string, amount: number) => {
  const destination = await getPayoutDestination(traderId)
  const payoutReference = `svpayout_${entryId.replace(/-/g, '').slice(0, 18)}_${Date.now()}`

  logger.info({
    event: 'savings_payout_initiate_started',
    traderId,
    entryId,
    amount,
    payoutReference,
    bankCode: destination.bankCode,
    accountNumberLast4: destination.accountNumber.slice(-4),
  })

  const transfer = await initiateSavingsPayoutTransfer({
    accountBank: destination.bankCode,
    accountNumber: destination.accountNumber,
    beneficiaryName: destination.accountName,
    bankName: destination.bankName,
    amount,
    reference: payoutReference,
    callbackUrl: getPayoutGatewayWebhookUrl(),
    narration: `TradeBook savings payout for ${entryId}`,
  })

  logger.info({
    event: 'savings_payout_initiate_completed',
    traderId,
    entryId,
    amount,
    payoutReference: transfer.reference,
    payoutTransferId: transfer.transferId,
    payoutStatus: transfer.status,
    providerMessage: transfer.message ?? null,
  })

  await savingsRepository.updatePayoutByEntryId(entryId, traderId, {
    recipientCode: destination.accountNumber,
    payoutReference: transfer.reference,
    payoutTransferId: transfer.transferId,
    payoutStatus: transfer.status,
    payoutFailureReason:
      transfer.status === 'FAILED' || transfer.status === 'OTP'
        ? (transfer.message ?? 'Could not initiate payout')
        : null,
    payoutTransferredAt: transfer.status === 'SUCCESS' ? new Date() : null,
  })
}

const isPayoutInFlight = (status?: string | null) => {
  const normalized = String(status ?? '').toUpperCase()
  return ['NEW', 'PENDING', 'PROCESSING', 'QUEUED'].includes(normalized)
}

export const savingsService = {
  async listBanks() {
    const banks = await listSavingsPayoutBanks()
    return banks
      .filter((bank): bank is { id: number | string; code: string; name: string } => Boolean(bank.code && bank.name))
      .map((bank) => ({ id: bank.id, code: bank.code, name: bank.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  async resolveSavingsAccount(input: { bankCode: string; accountNumber: string }) {
    const accountName = await resolveSavingsPayoutAccount(input.accountNumber, input.bankCode)
    return { accountName }
  },

  async createOrSync(traderId: string, actorId: string, role: 'OWNER' | 'SALESPERSON', input: CreateSavingsEntryInput) {
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
    return { period: { from: from.toISOString(), to: to.toISOString() }, total }
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
    const progressPercent = target.amount > 0 ? Math.min(Math.round((currentSaved / target.amount) * 1000) / 10, 100) : 0

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

  async updateTarget(traderId: string, role: 'OWNER' | 'SALESPERSON', input: UpdateSavingsTargetInput) {
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

  async updateSavingsAccount(traderId: string, role: 'OWNER' | 'SALESPERSON', input: UpdateSavingsAccountInput) {
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

  async getVerificationPreview(id: string, traderId: string, role: 'OWNER' | 'SALESPERSON') {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can verify savings entries', 403, 'FORBIDDEN')
    }

    const entry = await savingsRepository.findById(id, traderId)
    if (!entry) {
      throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    }

    const payoutDestination = await savingsRepository.getSavingsAccount(traderId)
    const latestAttempt = await savingsRepository.getLatestVerificationAttemptForEntry(id, traderId)

    return {
      entry: toSavingsEntryDTO(entry),
      payoutDestination:
        payoutDestination?.bankName &&
        payoutDestination.bankCode &&
        payoutDestination.accountNumber &&
        payoutDestination.accountName &&
        payoutDestination.setupAt
          ? toSavingsAccountDTO({
              bankName: payoutDestination.bankName,
              bankCode: payoutDestination.bankCode,
              accountNumber: payoutDestination.accountNumber,
              accountName: payoutDestination.accountName,
              setupAt: payoutDestination.setupAt,
            })
          : null,
      activeAttempt: latestAttempt ? toVerificationAttemptDTO(latestAttempt) : null,
      canProceed: entry.status !== 'VERIFIED',
      mode: 'FLUTTERWAVE_CHECKOUT' as const,
      message:
        entry.status === 'VERIFIED'
          ? 'This savings entry has already been verified.'
          : latestAttempt?.status === 'PENDING'
            ? 'Flutterwave payment is active. Complete the payment through the link below and TradeBook will verify it automatically.'
            : 'Generate a Flutterwave payment session to verify this savings entry.',
    }
  },

  async initiateVerification(id: string, traderId: string, role: 'OWNER' | 'SALESPERSON') {
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

    const now = new Date()
    const reusableAttempt = await savingsRepository.findReusablePendingVerificationAttempt(id, traderId, now)
    if (reusableAttempt) {
      return {
        entry: toSavingsEntryDTO(entry),
        attempt: toVerificationAttemptDTO(reusableAttempt),
        message: 'Flutterwave payment session is already active for this savings entry.',
      }
    }

    const { trader, email, name } = await buildPaymentCustomerForTrader(traderId)
    const reference = `svpay_${entry.id.replace(/-/g, '').slice(0, 18)}_${Date.now()}`
    const redirectUrl = new URL('/savings', env.FRONTEND_URL.endsWith('/') ? env.FRONTEND_URL : `${env.FRONTEND_URL}/`)
    redirectUrl.searchParams.set('savingsVerificationEntryId', id)
    redirectUrl.searchParams.set('savingsVerificationReference', reference)

    const transaction = await initializeSavingsPayment({
      email,
      amount: Number(entry.amount),
      reference,
      redirectUrl: redirectUrl.toString(),
      customerName: name,
      metadata: {
        traderId,
        savingsEntryId: entry.id,
        verificationType: 'savings',
        businessName: trader.businessName ?? trader.name,
      },
    })

    const attempt = await savingsRepository.createVerificationAttempt(traderId, id, {
      reference: transaction.reference,
      expectedAmount: Number(entry.amount),
      authorizationUrl: transaction.authorizationUrl,
      accessCode: transaction.accessCode,
      paystackEmail: email,
      expiresAt: new Date(now.getTime() + PAYMENT_ATTEMPT_TTL_MS),
    })

    await savingsRepository.markVerificationInitiated(id, traderId, {
      reference: transaction.reference,
      transferId: null,
      status: 'PENDING',
    })

    const updated = await savingsRepository.findById(id, traderId)
    if (!updated) {
      throw new AppError('Savings entry not found after initiating verification', 404, 'NOT_FOUND')
    }

    return {
      entry: toSavingsEntryDTO(updated),
      attempt: toVerificationAttemptDTO(attempt),
      message: 'Flutterwave payment session generated. Complete the payment and TradeBook will verify it automatically.',
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
        verified: true,
        reference: input.reference,
        status: 'SUCCESS' as const,
        entry: toSavingsEntryDTO(entry),
        message: 'This savings entry is already verified.',
      }
    }

    const attempt = await savingsRepository.findVerificationAttemptByReference(input.reference, traderId)
    if (!attempt) {
      throw new AppError('Savings verification attempt not found', 404, 'NOT_FOUND')
    }

    const verifiedPayment = await verifySavingsPaymentByReference(input.reference)
    logger.info({
      event: 'savings_flutterwave_verification_checked',
      traderId,
      entryId: id,
      reference: input.reference,
      paymentStatus: verifiedPayment.status,
      amount: verifiedPayment.amount,
      transactionId: verifiedPayment.transactionId,
    })

    if (verifiedPayment.status === 'successful') {
      const expectedAmount = Number(attempt.expectedAmount)
      if (Math.abs(verifiedPayment.amount - expectedAmount) > 0.009) {
        throw new AppError('Flutterwave payment amount did not match the savings entry', 400, 'PAYMENT_AMOUNT_MISMATCH')
      }

      await savingsRepository.markVerificationAttemptSuccess(attempt.id, {
        paystackReference: verifiedPayment.txRef,
        paystackTransactionId: verifiedPayment.transactionId,
        verifiedAt: verifiedPayment.paidAt ?? new Date(),
      })
      await savingsRepository.markVerifiedByReference(
        attempt.reference,
        verifiedPayment.transactionId,
        'SUCCESS',
      )
      await savingsRepository.updatePayoutByEntryId(entry.id, traderId, {
        payoutStatus: 'READY_TO_WITHDRAW',
        payoutFailureReason: null,
      })
    }

    const updated = await savingsRepository.findById(id, traderId)
    if (!updated) {
      throw new AppError('Savings entry not found after verification refresh', 404, 'NOT_FOUND')
    }

    const currentAttempt = await savingsRepository.findVerificationAttemptByReference(input.reference, traderId)
    const status = currentAttempt?.status ?? (verifiedPayment.status === 'successful' ? 'SUCCESS' : 'PENDING')

    return {
      verified: updated.status === 'VERIFIED',
      reference: input.reference,
      status,
      entry: toSavingsEntryDTO(updated),
      message:
        updated.status === 'VERIFIED'
          ? 'Savings payment verified successfully. You can withdraw this saving when payout funds are available.'
          : 'TradeBook is still waiting for Flutterwave to confirm this payment.',
    }
  },

  async handlePaystackWebhook(payload: any, providedSignature?: string | string[] | undefined) {
    if (!verifyPaystackWebhookSignature(payload, providedSignature)) {
      throw new AppError('Invalid Paystack webhook signature', 401, 'INVALID_WEBHOOK_SIGNATURE')
    }

    const eventType = String(payload?.event ?? 'unknown')
    const data = payload?.data ?? {}
    const externalReference = data?.reference ? String(data.reference) : null
    const signature = Array.isArray(providedSignature) ? providedSignature[0] : providedSignature

    logger.info({
      event: 'savings_paystack_webhook_received',
      eventType,
      externalReference,
      dataId: data?.id ? String(data.id) : null,
      dataStatus: data?.status ? String(data.status) : null,
    })

    if (eventType === 'charge.success') {
      const attempt = externalReference
        ? await savingsRepository.findVerificationAttemptByReference(externalReference)
        : null

      await savingsRepository.createPaystackWebhookEvent({
        traderId: attempt?.traderId ?? null,
        eventType,
        externalReference,
        signature,
        payload,
        processedAt: new Date(),
      })

      if (!attempt) {
        return { accepted: true, updated: false }
      }

      const amount = Number(data?.amount ?? 0) / 100
      const expectedAmount = Number(attempt.expectedAmount)
      if (Math.abs(amount - expectedAmount) > 0.009) {
        await savingsRepository.markVerificationAttemptStatus(attempt.id, 'FAILED')
        return { accepted: true, updated: false }
      }

      await savingsRepository.markVerificationAttemptSuccess(attempt.id, {
        paystackReference: externalReference,
        paystackTransactionId: data?.id ? String(data.id) : null,
        verifiedAt: data?.paid_at ? new Date(data.paid_at) : new Date(),
      })
      await savingsRepository.markVerifiedByReference(attempt.reference, data?.id ? String(data.id) : null, 'SUCCESS')
      await savingsRepository.updatePayoutByEntryId(attempt.savingsEntryId, attempt.traderId, {
        payoutStatus: 'READY_TO_WITHDRAW',
        payoutFailureReason: null,
      })

      return { accepted: true, updated: true }
    }

    if (eventType === 'transfer.success' || eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
      const entry = externalReference ? await savingsRepository.findByPayoutReference(externalReference) : null

      await savingsRepository.createPaystackWebhookEvent({
        traderId: entry?.traderId ?? null,
        eventType,
        externalReference,
        signature,
        payload,
        processedAt: new Date(),
      })

      if (!entry) {
        return { accepted: true, updated: false }
      }

      const payoutStatus = eventType === 'transfer.success'
        ? 'SUCCESS'
        : eventType === 'transfer.failed'
          ? 'FAILED'
          : 'REVERSED'

      logger.info({
        event: 'savings_paystack_transfer_webhook_processed',
        traderId: entry.traderId,
        entryId: entry.id,
        externalReference,
        payoutStatus,
        reason: data?.reason ? String(data.reason) : null,
        providerStatus: data?.status ? String(data.status) : null,
      })

      await savingsRepository.updatePayoutByEntryId(entry.id, entry.traderId, {
        payoutTransferId: data?.id ? String(data.id) : entry.payoutTransferId ?? null,
        payoutStatus,
        payoutFailureReason: data?.reason ? String(data.reason) : null,
        payoutTransferredAt: eventType === 'transfer.success' ? new Date() : null,
      })

      return { accepted: true, updated: true }
    }

    await savingsRepository.createPaystackWebhookEvent({
      eventType,
      externalReference,
      signature,
      payload,
      processedAt: new Date(),
    })

    return { accepted: true, updated: false }
  },

  async handleProviderCallback(input: { reference: string; transferId?: string | null; status: string }) {
    const entry = await savingsRepository.findByPayoutReference(input.reference)
    if (!entry) {
      return { accepted: true, updated: false }
    }

    const normalizedStatus = String(input.status ?? 'UNKNOWN').toUpperCase()
    const payoutStatus =
      normalizedStatus === 'SUCCESSFUL' || normalizedStatus === 'SUCCESS'
        ? 'SUCCESS'
        : normalizedStatus === 'FAILED'
          ? 'FAILED'
          : normalizedStatus === 'REVERSED'
            ? 'REVERSED'
            : normalizedStatus

    logger.info({
      event: 'savings_provider_callback_processed',
      traderId: entry.traderId,
      entryId: entry.id,
      externalReference: input.reference,
      payoutTransferId: input.transferId ?? null,
      payoutStatus,
    })

    await savingsRepository.updatePayoutByEntryId(entry.id, entry.traderId, {
      payoutTransferId: input.transferId ?? entry.payoutTransferId ?? null,
      payoutStatus,
      payoutFailureReason: payoutStatus === 'FAILED' ? 'Provider reported payout failure' : null,
      payoutTransferredAt: payoutStatus === 'SUCCESS' ? new Date() : null,
    })

    return { accepted: true, updated: true }
  },

  async withdrawSavingsEntry(id: string, traderId: string, role: 'OWNER' | 'SALESPERSON') {
    if (role !== 'OWNER') {
      throw new AppError('Only business owner can withdraw savings', 403, 'FORBIDDEN')
    }

    const entry = await savingsRepository.findById(id, traderId)
    if (!entry) {
      throw new AppError('Savings entry not found', 404, 'NOT_FOUND')
    }

    if (entry.status !== 'VERIFIED') {
      throw new AppError('Only verified savings can be withdrawn', 400, 'SAVINGS_NOT_VERIFIED')
    }

    if (String(entry.payoutStatus ?? '').toUpperCase() === 'SUCCESS') {
      throw new AppError('This saving has already been withdrawn', 400, 'ALREADY_WITHDRAWN')
    }

    if (isPayoutInFlight(entry.payoutStatus)) {
      throw new AppError('Withdrawal is already processing for this saving', 400, 'PAYOUT_ALREADY_PROCESSING')
    }

    try {
      logger.info({
        event: 'savings_manual_withdrawal_requested',
        traderId,
        entryId: id,
        amount: Number(entry.amount),
      })
      await maybeInitiatePayoutForEntry(id, traderId, Number(entry.amount))
    } catch (error: any) {
      const message = error?.message ?? 'Could not initiate withdrawal'
      logger.warn({
        event: 'savings_manual_withdrawal_failed',
        traderId,
        entryId: id,
        amount: Number(entry.amount),
        error: message,
      })
      await savingsRepository.updatePayoutByEntryId(id, traderId, {
        payoutStatus: 'FAILED',
        payoutFailureReason: message,
      })

      const failed = await savingsRepository.findById(id, traderId)
      if (!failed) {
        throw new AppError('Savings entry not found after withdrawal attempt', 404, 'NOT_FOUND')
      }

      return {
        entry: toSavingsEntryDTO(failed),
        message,
      }
    }

    const updated = await savingsRepository.findById(id, traderId)
    if (!updated) {
      throw new AppError('Savings entry not found after withdrawal attempt', 404, 'NOT_FOUND')
    }

    return {
      entry: toSavingsEntryDTO(updated),
      message: 'Withdrawal request sent. TradeBook will update the status once Flutterwave completes it.',
    }
  },

  async update(id: string, traderId: string, role: 'OWNER' | 'SALESPERSON', input: UpdateSavingsEntryInput) {
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
