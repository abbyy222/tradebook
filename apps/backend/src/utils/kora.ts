import crypto from 'crypto'
import https from 'https'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'

type KoraBank = {
  name?: string
  code?: string
  slug?: string
  country?: string
}

type KoraBanksResponse = {
  status: boolean
  message: string
  data?: KoraBank[]
}

type KoraResolveAccountResponse = {
  status: boolean
  message: string
  data?: {
    bank_name?: string
    bank_code?: string
    account_number?: string
    account_name?: string
  }
}

type KoraDisburseResponse = {
  status: boolean
  message: string
  data?: {
    reference?: string
    status?: string
    amount?: string | number
    fee?: string | number
    currency?: string
    narration?: string
    message?: string
  }
}

const ensureKoraConfigured = () => {
  if (!env.KORA_SECRET_KEY) {
    throw new AppError('Kora secret key is missing in backend environment', 500, 'KORA_NOT_CONFIGURED')
  }
}

const makeKoraRequest = async <T>(
  method: 'GET' | 'POST',
  path: string,
  payload?: Record<string, unknown>,
) => {
  ensureKoraConfigured()

  const body = payload ? JSON.stringify(payload) : null
  const url = new URL(path, env.KORA_BASE_URL)

  return new Promise<T>((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${env.KORA_SECRET_KEY}`,
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

          reject(new Error(`Kora request failed with status ${statusCode}: ${data || 'No response body'}`))
        })
      },
    )

    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })
}

export const listKoraBanks = async (countryCode = 'NG') => {
  const response = await makeKoraRequest<KoraBanksResponse>(
    'GET',
    `/merchant/api/v1/misc/banks?countryCode=${encodeURIComponent(countryCode)}`,
  )

  return response.data ?? []
}

export const resolveKoraBankAccount = async (accountNumber: string, bankCode: string, currency = 'NG') => {
  const response = await makeKoraRequest<KoraResolveAccountResponse>(
    'POST',
    '/merchant/api/v1/misc/banks/resolve',
    {
      bank: bankCode,
      account: accountNumber,
      currency,
    },
  )

  const accountName = response.data?.account_name?.trim()
  if (!accountName) {
    throw new AppError(response.message || 'Could not resolve bank account details', 400, 'ACCOUNT_RESOLVE_FAILED')
  }

  return {
    accountName,
    accountNumber: response.data?.account_number?.trim() || accountNumber,
    bankCode: response.data?.bank_code?.trim() || bankCode,
    bankName: response.data?.bank_name?.trim() || '',
  }
}

export const initiateKoraBankTransfer = async (input: {
  reference: string
  amount: number
  narration: string
  bankCode: string
  accountNumber: string
  customerName: string
  customerEmail: string
}) => {
  const response = await makeKoraRequest<KoraDisburseResponse>(
    'POST',
    '/merchant/api/v1/transactions/disburse',
    {
      reference: input.reference,
      destination: {
        type: 'bank_account',
        amount: Number(input.amount.toFixed(2)),
        currency: 'NGN',
        narration: input.narration,
        bank_account: {
          bank: input.bankCode,
          account: input.accountNumber,
        },
        customer: {
          name: input.customerName,
          email: input.customerEmail,
        },
      },
    },
  )

  return {
    transferId: null,
    reference: response.data?.reference?.trim() || input.reference,
    status: String(response.data?.status ?? 'processing').toUpperCase(),
    message: response.data?.message?.trim() || response.message,
  }
}

export const verifyKoraWebhookSignature = (payload: unknown, providedSignature?: string | string[] | undefined) => {
  ensureKoraConfigured()

  const signature = Array.isArray(providedSignature) ? providedSignature[0] : providedSignature
  if (!signature || !payload || typeof payload !== 'object' || !('data' in payload)) {
    return false
  }

  const data = (payload as { data?: unknown }).data
  const expected = crypto
    .createHmac('sha256', env.KORA_SECRET_KEY!)
    .update(JSON.stringify(data))
    .digest('hex')

  return expected === signature
}
