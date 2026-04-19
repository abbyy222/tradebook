import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorizeRole } from '../../middleware/authorizeRole'
import { createSupplierSchema, listSuppliersQuerySchema, updateSupplierSchema } from './suppliers.schema'
import { suppliersService } from './suppliers.service'
import { enforceModuleWritable } from '../../middleware/enforceModuleWritable'

export const suppliersRouter = Router()
suppliersRouter.use(authenticate)

suppliersRouter.post('/sync', enforceModuleWritable('SUPPLIERS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createSupplierSchema.parse(req.body)
    const supplier = await suppliersService.createOrSync(req.trader!.traderId, input)
    res.status(201).json({ data: supplier, error: null })
  } catch (err) { next(err) }
})

suppliersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listSuppliersQuerySchema.parse(req.query)
    const result = await suppliersService.list(req.trader!.traderId, query)
    res.status(200).json(result)
  } catch (err) { next(err) }
})

suppliersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const supplier = await suppliersService.getOne(id, req.trader!.traderId)
    res.status(200).json({ data: supplier, error: null })
  } catch (err) { next(err) }
})

suppliersRouter.patch('/:id', enforceModuleWritable('SUPPLIERS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = updateSupplierSchema.parse(req.body)
    const result = await suppliersService.update(id, req.trader!.traderId, input)
    res.status(200).json({ data: result, error: null })
  } catch (err) { next(err) }
})

suppliersRouter.delete('/:id', authorizeRole('OWNER'), enforceModuleWritable('SUPPLIERS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await suppliersService.remove(id, req.trader!.traderId)
    res.status(200).json({ data: result, error: null })
  } catch (err) { next(err) }
})
