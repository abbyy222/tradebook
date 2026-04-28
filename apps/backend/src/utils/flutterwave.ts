import https from 'https'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'

type FlutterwaveBank = {
  id: number | string
  code: string
  name: string
}

type FlutterwaveResolveResponse = {
  status: string
  data?: {
    account_name?: string
  }
  message?: string
}

type FlutterwaveTransferResponse = {
  status: string
  data?: {
    id?: number | string
    reference?: string
    status?: string
  }
  message?: string
}

type FlutterwaveVerifyTransactionResponse = {
  status: string
  data?: {
    id?: number | string
    tx_ref?: string
    status?: string
    amount?: number | string
    currency?: string
  }
  message?: string
}

const ensureFlutterwaveConfigured = () => {
  if (!env.FLW_SECRET_KEY) {
    throw new AppError('Flutterwave secret key is missing in backend environment', 500, 'FLW_NOT_CONFIGURED')
  }
}

const makeFlutterwaveRequest = async <T>(
  method: 'GET' | 'POST',
  path: string,
  payload?: Record<string, unknown>,
) => {
  ensureFlutterwaveConfigured()

  const body = payload ? JSON.stringify(payload) : null
  const url = new URL(path, env.FLW_BASE_URL)

  return new Promise<T>((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
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

          reject(new Error(`Flutterwave request failed with status ${statusCode}: ${data || 'No response body'}`))
        })
      },
    )

    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })
}

export const listFlutterwaveBanks = async (country = 'NG') => {
  const response = await makeFlutterwaveRequest<{ data?: FlutterwaveBank[] }>('GET', `/v3/banks/${country}`)
  return response.data ?? []
}

export const resolveFlutterwaveAccount = async (accountNumber: string, bankCode: string) => {
  const response = await makeFlutterwaveRequest<FlutterwaveResolveResponse>('POST', '/v3/accounts/resolve', {
    account_number: accountNumber,
    account_bank: bankCode,
  })

  const accountName = response.data?.account_name?.trim()
  if (!accountName) {
    throw new AppError(response.message || 'Could not resolve bank account details', 400, 'ACCOUNT_RESOLVE_FAILED')
  }

  return accountName
}

export const initiateFlutterwaveTransfer = async (input: {
  accountBank: string
  accountNumber: string
  beneficiaryName: string
  bankName: string
  amount: number
  reference: string
  callbackUrl: string
  narration: string
}) => {
  const response = await makeFlutterwaveRequest<FlutterwaveTransferResponse>('POST', '/v3/transfers', {
    account_bank: input.accountBank,
    account_number: input.accountNumber,
    amount: input.amount,
    currency: 'NGN',
    beneficiary_name: input.beneficiaryName,
    bank_name: input.bankName,
    reference: input.reference,
    callback_url: input.callbackUrl,
    narration: input.narration,
  })

  return {
    transferId: response.data?.id ? String(response.data.id) : null,
    reference: response.data?.reference ?? input.reference,
    status: response.data?.status ?? 'PENDING',
  }
}

export const verifyFlutterwaveTransactionByReference = async (txRef: string) => {
  const response = await makeFlutterwaveRequest<FlutterwaveVerifyTransactionResponse>(
    'GET',
    `/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
  )

  if (!response.data?.tx_ref) {
    throw new AppError(response.message || 'Could not verify Flutterwave transaction', 400, 'TRANSACTION_VERIFY_FAILED')
  }

  return {
    transactionId: response.data.id ? String(response.data.id) : null,
    txRef: response.data.tx_ref,
    status: String(response.data.status ?? 'UNKNOWN').toLowerCase(),
    amount: Number(response.data.amount ?? 0),
    currency: String(response.data.currency ?? ''),
  }
}
