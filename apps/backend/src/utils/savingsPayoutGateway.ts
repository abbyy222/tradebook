import https from 'https'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { initiateFlutterwaveTransfer } from './flutterwave'
import { listPaystackBanks, resolvePaystackAccount } from './paystack'

type SavingsBank = {
  id: number | string
  code: string
  name: string
}

type TransferRequest = {
  accountBank: string
  accountNumber: string
  beneficiaryName: string
  bankName: string
  amount: number
  reference: string
  callbackUrl: string
  narration: string
}

type TransferResult = {
  transferId: string | null
  reference: string
  status: string
  message?: string | null
}

const ensureProxyConfigured = () => {
  if (!env.SAVINGS_PAYOUT_SERVICE_URL || !env.SAVINGS_PAYOUT_SERVICE_TOKEN) {
    throw new AppError(
      'Savings payout proxy is not fully configured. Set SAVINGS_PAYOUT_SERVICE_URL and SAVINGS_PAYOUT_SERVICE_TOKEN.',
      500,
      'PAYOUT_PROXY_NOT_CONFIGURED',
    )
  }
}

const makeProxyRequest = async <T>(
  method: 'GET' | 'POST',
  path: string,
  payload?: Record<string, unknown>,
) => {
  ensureProxyConfigured()

  const baseUrl = env.SAVINGS_PAYOUT_SERVICE_URL!
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  const body = payload ? JSON.stringify(payload) : null

  return new Promise<T>((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${env.SAVINGS_PAYOUT_SERVICE_TOKEN}`,
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
              const parsed = data ? JSON.parse(data) : {}
              resolve((parsed.data ?? parsed) as T)
            } catch (error) {
              reject(error)
            }
            return
          }

          reject(new Error(`Savings payout proxy request failed with status ${statusCode}: ${data || 'No response body'}`))
        })
      },
    )

    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })
}

export const listSavingsPayoutBanks = async () => {
  if (env.SAVINGS_PAYOUT_PROVIDER === 'PROXY') {
    return makeProxyRequest<SavingsBank[]>('GET', '/api/v1/banks')
  }

  return listPaystackBanks('nigeria')
}

export const resolveSavingsPayoutAccount = async (accountNumber: string, bankCode: string) => {
  if (env.SAVINGS_PAYOUT_PROVIDER === 'PROXY') {
    const result = await makeProxyRequest<{ accountName: string }>('POST', '/api/v1/accounts/resolve', {
      accountNumber,
      bankCode,
    })
    return result.accountName
  }

  return resolvePaystackAccount(accountNumber, bankCode)
}

export const initiateSavingsPayoutTransfer = async (input: TransferRequest): Promise<TransferResult> => {
  if (env.SAVINGS_PAYOUT_PROVIDER === 'PROXY') {
    return makeProxyRequest<TransferResult>('POST', '/api/v1/transfers', input)
  }

  return initiateFlutterwaveTransfer(input)
}
