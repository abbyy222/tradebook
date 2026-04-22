import { AppError } from '../../middleware/errorHandler'
import { authRepository } from '../auth/auth.repository'
import { SubmitFeedbackInput } from './feedback.schema'
import { sendBrevoEmail } from '../../utils/brevo'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

type FeedbackActorContext = {
  traderId: string
  actorId: string
  role: 'OWNER' | 'SALESPERSON'
  phoneNumber: string
}

const buildFeedbackSubject = (category: string, businessName: string, pagePath: string) =>
  `[TradeBook Complaint] ${businessName} - ${category} (${pagePath})`

const buildFeedbackBody = (input: {
  category: string
  message: string
  pagePath: string
  reporterName?: string
  businessName: string
  accountName: string
  businessPhone: string
  actorRole: 'OWNER' | 'SALESPERSON'
  sentAt: string
}) => {
  const lines = [
    'TradeBook complaint received',
    '',
    `Business: ${input.businessName}`,
    `Account name: ${input.accountName}`,
    `Reporter: ${input.reporterName ?? input.accountName}`,
    `Role: ${input.actorRole}`,
    `Phone: ${input.businessPhone}`,
    `Category: ${input.category}`,
    `Page: ${input.pagePath}`,
    `Sent at: ${input.sentAt}`,
    '',
    'Complaint details:',
    input.message,
  ]

  return lines.join('\n')
}

export const feedbackService = {
  async submitFeedback(actor: FeedbackActorContext, input: SubmitFeedbackInput) {
    const [businessTrader, accountActor] = await Promise.all([
      authRepository.findById(actor.traderId),
      authRepository.findById(actor.actorId),
    ])

    if (!businessTrader || !accountActor) {
      throw new AppError('Account context not found', 404, 'NOT_FOUND')
    }

    const sentAt = new Date().toISOString()
    const businessName = businessTrader.businessName ?? businessTrader.name
    const accountName = accountActor.name
    const subject = buildFeedbackSubject(input.category, businessName, input.pagePath)
    const textContent = buildFeedbackBody({
      category: input.category,
      message: input.message,
      pagePath: input.pagePath,
      reporterName: input.reporterName,
      businessName,
      accountName,
      businessPhone: businessTrader.phoneNumber,
      actorRole: actor.role,
      sentAt,
    })

    try {
      await sendBrevoEmail({
        subject,
        textContent,
        to: [{ email: env.FEEDBACK_ADMIN_EMAIL, name: 'TradeBook Admin' }],
        cc: [{ email: env.FEEDBACK_DEV_EMAIL, name: 'TradeBook Developer' }],
      })
    } catch (error) {
      logger.error({
        event: 'feedback_delivery_failed',
        traderId: actor.traderId,
        actorId: actor.actorId,
        category: input.category,
        pagePath: input.pagePath,
        error: error instanceof Error ? error.message : 'Unknown Brevo delivery error',
      })

      throw new AppError(
        'Complaint could not be delivered right now. Please verify Brevo sender settings and try again.',
        502,
        'EMAIL_DELIVERY_FAILED'
      )
    }

    logger.info({
      event: 'feedback_submitted',
      traderId: actor.traderId,
      actorId: actor.actorId,
      category: input.category,
      pagePath: input.pagePath,
      sentAt,
    })

    return {
      delivered: true as const,
      sentAt,
    }
  },
}
