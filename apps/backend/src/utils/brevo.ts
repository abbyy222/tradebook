import https from 'https'
import { env } from '../config/env'

type BrevoRecipient = {
  email: string
  name?: string
}

type SendBrevoEmailInput = {
  subject: string
  textContent: string
  to: BrevoRecipient[]
  cc?: BrevoRecipient[]
}

type BrevoSuccessResponse = {
  messageId?: string
}

export const sendBrevoEmail = async (input: SendBrevoEmailInput) => {
  const payload = JSON.stringify({
    sender: {
      email: env.BREVO_SENDER_EMAIL,
      name: env.BREVO_SENDER_NAME,
    },
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    textContent: input.textContent,
  })

  const response = await new Promise<BrevoSuccessResponse>((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'api-key': env.BREVO_API_KEY,
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
              resolve(data ? (JSON.parse(data) as BrevoSuccessResponse) : {})
            } catch (error) {
              reject(error)
            }
            return
          }

          reject(new Error(`Brevo email request failed with status ${statusCode}: ${data || 'No response body'}`))
        })
      }
    )

    request.on('error', reject)
    request.write(payload)
    request.end()
  })

  return response
}
