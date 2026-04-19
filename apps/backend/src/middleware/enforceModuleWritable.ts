import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'
import { platformDevService } from '../modules/platformDev/platformDev.service'
import type { PlatformModuleKey } from '../modules/platformDev/platformDev.schema'

export const enforceModuleWritable = (module: PlatformModuleKey) => {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const enabled = await platformDevService.isModuleEnabled(module)
      if (!enabled) {
        throw new AppError(`${module.toLowerCase()} operations are temporarily paused for maintenance`, 503, 'MODULE_PAUSED')
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
