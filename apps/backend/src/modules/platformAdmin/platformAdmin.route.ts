import { Router, Request, Response, NextFunction } from 'express'
import { authenticateInternal } from '../../middleware/authenticateInternal'
import { authorizeInternalRole } from '../../middleware/authorizeInternalRole'
import { platformAdminBusinessesQuerySchema, platformAdminRangeQuerySchema } from './platformAdmin.schema'
import { platformAdminService } from './platformAdmin.service'

export const platformAdminRouter = Router()
platformAdminRouter.use(authenticateInternal, authorizeInternalRole('PLATFORM_ADMIN'))

platformAdminRouter.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = platformAdminRangeQuerySchema.parse(req.query)
    const result = await platformAdminService.getOverview(query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformAdminRouter.get('/businesses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = platformAdminBusinessesQuerySchema.parse(req.query)
    const result = await platformAdminService.getBusinessesDirectory(query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})
