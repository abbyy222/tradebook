import { Router, Request, Response, NextFunction } from 'express'
import { authenticateInternal } from '../../middleware/authenticateInternal'
import { authorizeInternalRole } from '../../middleware/authorizeInternalRole'
import { platformDevService } from './platformDev.service'
import {
  deadLetterQuerySchema,
  forceResyncSchema,
  platformDevEventsQuerySchema,
  tenantHeatmapQuerySchema,
  updateKillSwitchSchema,
} from './platformDev.schema'

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

platformDevRouter.get('/errors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = platformDevEventsQuerySchema.parse(req.query)
    const result = await platformDevService.getErrorEvents(query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformDevRouter.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = platformDevEventsQuerySchema.parse(req.query)
    const result = await platformDevService.getRequestTraces(query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformDevRouter.get('/sync-health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformDevService.getSyncHealth()
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformDevRouter.get('/kill-switches', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await platformDevService.listKillSwitches()
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformDevRouter.patch('/kill-switches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateKillSwitchSchema.parse(req.body)
    const result = await platformDevService.updateKillSwitch(input.module, input.enabled, req.internalUser!.internalUserId)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformDevRouter.get('/dead-letter', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = deadLetterQuerySchema.parse(req.query)
    const result = await platformDevService.getDeadLetterQueue(query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformDevRouter.get('/tenant-heatmap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = tenantHeatmapQuerySchema.parse(req.query)
    const result = await platformDevService.getTenantHeatmap(query)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

platformDevRouter.post('/force-resync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = forceResyncSchema.parse(req.body)
    const result = await platformDevService.forceResync(input)
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})
