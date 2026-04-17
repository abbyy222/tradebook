import { Router, Request, Response, NextFunction } from 'express'
import { authenticateInternal } from '../../middleware/authenticateInternal'
import { authorizeInternalRole } from '../../middleware/authorizeInternalRole'
import { createPlatformAdminSchema, internalLoginSchema } from './internalAuth.schema'
import { internalAuthService } from './internalAuth.service'

export const internalAuthRouter = Router()

internalAuthRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = internalLoginSchema.parse(req.body)
    const result = await internalAuthService.login(input)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

internalAuthRouter.get('/me', authenticateInternal, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await internalAuthService.me(req.internalUser!.internalUserId)
    res.status(200).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
})

internalAuthRouter.post(
  '/admins',
  authenticateInternal,
  authorizeInternalRole('PLATFORM_DEV'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createPlatformAdminSchema.parse(req.body)
      const result = await internalAuthService.createPlatformAdmin(req.internalUser!.role, input)
      res.status(201).json({ data: result, error: null })
    } catch (err) {
      next(err)
    }
  }
)

internalAuthRouter.get(
  '/admins',
  authenticateInternal,
  authorizeInternalRole('PLATFORM_DEV'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await internalAuthService.listPlatformAdmins()
      res.status(200).json({ data: result, error: null })
    } catch (err) {
      next(err)
    }
  }
)

