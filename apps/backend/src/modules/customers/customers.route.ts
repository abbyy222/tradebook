import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorizeRole } from '../../middleware/authorizeRole'
import { createCustomerSchema, listCustomersQuerySchema, updateCustomerSchema } from './customers.schema'
import { customersService } from './customers.service'
import { enforceModuleWritable } from '../../middleware/enforceModuleWritable'

export const customersRouter = Router()
customersRouter.use(authenticate)

customersRouter.post('/sync', enforceModuleWritable('CUSTOMERS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createCustomerSchema.parse(req.body)
    const customer = await customersService.createOrSync(req.trader!.traderId, input)
    res.status(201).json({ data: customer, error: null })
  } catch (err) { next(err) }
})

customersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCustomersQuerySchema.parse(req.query)
    const result = await customersService.list(req.trader!.traderId, query)
    res.status(200).json(result)
  } catch (err) { next(err) }
})

customersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const customer = await customersService.getOne(id, req.trader!.traderId)
    res.status(200).json({ data: customer, error: null })
  } catch (err) { next(err) }
})

customersRouter.patch('/:id', enforceModuleWritable('CUSTOMERS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const input = updateCustomerSchema.parse(req.body)
    const result = await customersService.update(id, req.trader!.traderId, input)
    res.status(200).json({ data: result, error: null })
  } catch (err) { next(err) }
})

customersRouter.delete('/:id', authorizeRole('OWNER'), enforceModuleWritable('CUSTOMERS'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const result = await customersService.remove(id, req.trader!.traderId)
    res.status(200).json({ data: result, error: null })
  } catch (err) { next(err) }
})
