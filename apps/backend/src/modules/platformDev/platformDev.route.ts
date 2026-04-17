import { Router, Request, Response, NextFunction } from 'express'
import { authenticateInternal } from '../../middleware/authenticateInternal'
import { authorizeInternalRole } from '../../middleware/authorizeInternalRole'
import { platformDevService } from './platformDev.service'

export const platformDevRouter = Router()
platformDevRouter.use(authenticateInternal, authorizeInternalRole('PLATFORM_DEV'))

platformDevRouter.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformDevService.getConsoleOverview()
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

