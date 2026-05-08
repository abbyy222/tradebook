import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { z } from 'zod'
import { env } from './config/env'
import {
  listFlutterwaveBanks,
  resolveFlutterwaveAccount,
  initiateFlutterwaveTransfer,
  initializeFlutterwavePayment,
  verifyFlutterwaveTransactionByReference,
} from './utils/flutterwave'
import { postJson } from './utils/http'

const app = express()

app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json({ limit: '10kb' }))

const requireGatewayToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token !== env.GATEWAY_TOKEN) {
    return res.status(401).json({ data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } })
  }

  next()
}

const resolveAccountSchema = z.object({
  bankCode: z.string().trim().min(2),
  accountNumber: z.string().trim().regex(/^\d{10,20}$/),
})

const initiateTransferSchema = z.object({
  accountBank: z.string().trim().min(2),
  accountNumber: z.string().trim().regex(/^\d{10,20}$/),
  beneficiaryName: z.string().trim().min(2),
  bankName: z.string().trim().min(2),
  amount: z.number().positive(),
  reference: z.string().trim().min(8),
  callbackUrl: z.string().url(),
  narration: z.string().trim().min(4),
})

const initializePaymentSchema = z.object({
  email: z.string().trim().email(),
  amount: z.number().positive(),
  reference: z.string().trim().min(8),
  redirectUrl: z.string().url(),
  customerName: z.string().trim().min(2),
  metadata: z.record(z.string(), z.unknown()),
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/v1/banks', requireGatewayToken, async (_req, res) => {
  const banks = await listFlutterwaveBanks()
  res.status(200).json({
    data: banks
      .filter((bank) => bank.code && bank.name)
      .map((bank) => ({ id: bank.id, code: bank.code, name: bank.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    error: null,
  })
})

app.post('/api/v1/accounts/resolve', requireGatewayToken, async (req, res) => {
  const input = resolveAccountSchema.parse(req.body)
  const accountName = await resolveFlutterwaveAccount(input.accountNumber, input.bankCode)
  res.status(200).json({ data: { accountName }, error: null })
})

app.post('/api/v1/transfers', requireGatewayToken, async (req, res) => {
  const input = initiateTransferSchema.parse(req.body)
  const result = await initiateFlutterwaveTransfer(input)
  res.status(200).json({ data: result, error: null })
})

app.post('/api/v1/payments', requireGatewayToken, async (req, res) => {
  const input = initializePaymentSchema.parse(req.body)
  const result = await initializeFlutterwavePayment(input)
  res.status(200).json({ data: result, error: null })
})

app.get('/api/v1/payments/:reference/verify', requireGatewayToken, async (req, res) => {
  const reference = z.string().trim().min(8).parse(req.params.reference)
  const result = await verifyFlutterwaveTransactionByReference(reference)
  res.status(200).json({ data: result, error: null })
})

app.post('/api/v1/flutterwave/webhook', async (req, res) => {
  const providedSecret =
    (req.headers['verif-hash'] as string | undefined) ??
    (req.headers['flutterwave-signature'] as string | undefined) ??
    null

  if (providedSecret !== env.FLW_WEBHOOK_SECRET) {
    return res.status(401).json({ data: null, error: { message: 'Invalid signature', code: 'INVALID_SIGNATURE' } })
  }

  const reference = req.body?.data?.reference
  const transferId = req.body?.data?.id ? String(req.body.data.id) : null
  const status = String(req.body?.data?.status ?? req.body?.status ?? 'UNKNOWN').toUpperCase()

  if (reference) {
    await postJson(
      env.GATEWAY_CALLBACK_URL,
      { reference, transferId, status },
      { 'x-tradebook-payout-secret': env.GATEWAY_CALLBACK_SECRET },
    )
  }

  res.status(200).json({ data: { accepted: true }, error: null })
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err instanceof z.ZodError ? 400 : 500
  const message = err instanceof z.ZodError ? 'Validation failed' : (err?.message || 'Something went wrong')
  const code = err instanceof z.ZodError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'

  return res.status(statusCode).json({
    data: null,
    error: { message, code },
  })
})

export { app }
