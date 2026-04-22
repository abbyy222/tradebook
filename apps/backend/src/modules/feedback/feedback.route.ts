import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { submitFeedbackSchema } from './feedback.schema'
import { feedbackService } from './feedback.service'
import { logger } from '../../utils/logger'

export const feedbackRouter = Router()
feedbackRouter.use(authenticate)

feedbackRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.trader!
      const input = submitFeedbackSchema.parse(req.body)
      const result = await feedbackService.submitFeedback(actor, input)
      res.status(201).json({ data: result, error: null })
    } catch (err) {
      logger.warn({
        requestId: req.requestId,
        route: '/feedback',
        body: req.body,
        error: err instanceof Error ? err.message : 'Unknown feedback submission error',
      })
      next(err)
    }
  }
)
