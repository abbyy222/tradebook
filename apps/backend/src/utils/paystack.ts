import crypto from 'crypto'
import https from 'https'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'

type PaystackTransactionInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url?: string
    access_code?: string
    reference?: string
  }
}

type PaystackVerifyTransactionResponse = {
  status: boolean
  message: string
  data?: {
    id?: number | string
    reference?: string
    status?: string
    amount?: number
    currency?: string
    paid_at?: string
  }
}

type PaystackTransferRecipientResponse = {
  status: boolean
  message: string
  data?: {
    recipient_code?: string
    details?: {
      account_number?: string
      bank_code?: string
      bank_name?: string
    }
    name?: string
  }
}

type PaystackBank = {
  id?: number | string
  name?: string
  code?: string
  active?: boolean
}

type PaystackBanksResponse = {
  status: boolean
  message: string
  data?: PaystackBank[]
}

type PaystackResolveAccountResponse = {
  status: boolean
  message: string
  data?: {
    account_number?: string
    account_name?: string
    bank_id?: number | string
  }
}

type PaystackTransferResponse = {
  status: boolean
  message: string
  data?: {
    id?: number | string
    reference?: string
    status?: string
  }
}

const ensurePaystackConfigured = () => {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new AppError('Paystack secret key is missing in backend environment', 500, 'PAYSTACK_NOT_CONFIGURED')
  }
}

const makePaystackRequest = async <T>(
  method: 'GET' | 'POST',
  path: string,
  payload?: Record<string, unknown>,
) => {
  ensurePaystackConfigured()

  const body = payload ? JSON.stringify(payload) : null
  const url = new URL(path, env.PAYSTACK_BASE_URL)

  return new Promise<T>((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          const statusCode = res.statusCode ?? 500
          if (statusCode >= 200 && statusCode < 300) {
            try {
              resolve((data ? JSON.parse(data) : {}) as T)
            } catch (error) {
              reject(error)
            }
            return
          }

          reject(new Error(`Paystack request failed with status ${statusCode}: ${data || 'No response body'}`))
        })
      },
    )

    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })
}

export const initializePaystackTransaction = async (input: {
  email: string
  amount: number
  reference: string
  callbackUrl?: string
  metadata?: Record<string, unknown>
  channels?: string[]
}) => {
  const response = await makePaystackRequest<PaystackTransactionInitializeResponse>('POST', '/transaction/initialize', {
    email: input.email,
    amount: Math.round(input.amount * 100),
    currency: 'NGN',
    reference: input.reference,
    ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.channels?.length ? { channels: input.channels } : {}),
  })

  const authorizationUrl = response.data?.authorization_url?.trim()
  if (!authorizationUrl) {
    throw new AppError(response.message || 'Could not initialize Paystack transaction', 400, 'PAYSTACK_TRANSACTION_INIT_FAILED')
  }

  return {
    authorizationUrl,
    accessCode: response.data?.access_code?.trim() || null,
    reference: response.data?.reference?.trim() || input.reference,
  }
}

export const verifyPaystackTransaction = async (reference: string) => {
  const response = await makePaystackRequest<PaystackVerifyTransactionResponse>(
    'GET',
    `/transaction/verify/${encodeURIComponent(reference)}`,
  )

  const txReference = response.data?.reference?.trim()
  if (!txReference) {
    throw new AppError(response.message || 'Could not verify Paystack transaction', 400, 'PAYSTACK_TRANSACTION_VERIFY_FAILED')
  }

  return {
    transactionId: response.data?.id ? String(response.data.id) : null,
    reference: txReference,
    status: String(response.data?.status ?? 'unknown').toLowerCase(),
    amount: Number(response.data?.amount ?? 0) / 100,
    currency: String(response.data?.currency ?? ''),
    paidAt: response.data?.paid_at ? new Date(response.data.paid_at) : null,
  }
}

export const listPaystackBanks = async (country = 'nigeria') => {
  const response = await makePaystackRequest<PaystackBanksResponse>(
    'GET',
    `/bank?country=${encodeURIComponent(country)}`,
  )

  return (response.data ?? []).filter((bank) => bank.code && bank.name && bank.active !== false)
}

export const resolvePaystackAccount = async (accountNumber: string, bankCode: string) => {
  const response = await makePaystackRequest<PaystackResolveAccountResponse>(
    'GET',
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
  )

  const accountName = response.data?.account_name?.trim()
  if (!accountName) {
    throw new AppError(response.message || 'Could not resolve bank account details', 400, 'ACCOUNT_RESOLVE_FAILED')
  }

  return accountName
}

export const createPaystackTransferRecipient = async (input: {
  name: string
  accountNumber: string
  bankCode: string
}) => {
  const response = await makePaystackRequest<PaystackTransferRecipientResponse>('POST', '/transferrecipient', {
    type: 'nuban',
    name: input.name,
    account_number: input.accountNumber,
    bank_code: input.bankCode,
    currency: 'NGN',
  })

  const recipientCode = response.data?.recipient_code?.trim()
  if (!recipientCode) {
    throw new AppError(response.message || 'Could not create Paystack transfer recipient', 400, 'PAYSTACK_TRANSFER_RECIPIENT_CREATE_FAILED')
  }

  return {
    recipientCode,
    accountNumber: response.data?.details?.account_number?.trim() || input.accountNumber,
    bankCode: response.data?.details?.bank_code?.trim() || input.bankCode,
    accountName: response.data?.name?.trim() || input.name,
    bankName: response.data?.details?.bank_name?.trim() || '',
  }
}

export const initiatePaystackTransfer = async (input: {
  recipientCode: string
  amount: number
  reference: string
  reason: string
}) => {
  const response = await makePaystackRequest<PaystackTransferResponse>('POST', '/transfer', {
    source: 'balance',
    amount: Math.round(input.amount * 100),
    recipient: input.recipientCode,
    reference: input.reference,
    reason: input.reason,
    currency: 'NGN',
  })

  return {
    transferId: response.data?.id ? String(response.data.id) : null,
    reference: response.data?.reference?.trim() || input.reference,
    status: String(response.data?.status ?? 'pending').toUpperCase(),
    message: response.message,
  }
}

export const verifyPaystackWebhookSignature = (payload: unknown, providedSignature?: string | string[] | undefined) => {
  ensurePaystackConfigured()

  const signature = Array.isArray(providedSignature) ? providedSignature[0] : providedSignature
  if (!signature) return false

  const expected = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY!)
    .update(JSON.stringify(payload))
    .digest('hex')

  return expected === signature
}
