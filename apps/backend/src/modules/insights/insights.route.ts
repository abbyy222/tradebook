import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorizeRole } from '../../middleware/authorizeRole'
import { insightsRangeQuerySchema } from './insights.schema'
import { insightsService } from './insights.service'

export const insightsRouter = Router()
insightsRouter.use(authenticate, authorizeRole('OWNER'))

insightsRouter.get('/business', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = insightsRangeQuerySchema.parse(req.query)
    const result = await insightsService.getBusinessOverview(req.trader!.traderId, query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

insightsRouter.get('/developer', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await insightsService.getDeveloperOverview()
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

