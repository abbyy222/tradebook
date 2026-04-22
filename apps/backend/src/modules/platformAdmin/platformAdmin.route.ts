import { Router, Request, Response, NextFunction } from 'express'
import { authenticateInternal } from '../../middleware/authenticateInternal'
import { authorizeInternalRole } from '../../middleware/authorizeInternalRole'
import {
  platformAdminBusinessesQuerySchema,
  platformAdminBusinessActionLogQuerySchema,
  platformAdminRangeQuerySchema,
  platformBusinessRepairSchema,
  platformBusinessStatusUpdateSchema,
} from './platformAdmin.schema'
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

platformAdminRouter.patch('/businesses/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = platformBusinessStatusUpdateSchema.parse(req.body)
    const result = await platformAdminService.updateBusinessStatus({
      traderId,
      accountStatus: input.accountStatus,
      reason: input.reason,
      actorInternalUserId: req.internalUser!.internalUserId,
    })
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformAdminRouter.post('/businesses/:id/repair', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const traderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = platformBusinessRepairSchema.parse(req.body ?? {})
    const result = await platformAdminService.repairBusinessSync({
      traderId,
      reason: input.reason,
      actorInternalUserId: req.internalUser!.internalUserId,
    })
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformAdminRouter.get('/business-actions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = platformAdminBusinessActionLogQuerySchema.parse(req.query)
    const result = await platformAdminService.getBusinessActionLogs(query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})
