import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { customersApi } from '@/api/customers.api'
import type { CreateCustomerDTO, CursorPaginatedResponse, CustomerDTO } from '@tradebook/shared-types'

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: object) => [...customerKeys.lists(), filters] as const,
}

const PAGE_SIZE = 20

export const useCustomersList = (search?: string) => {
  return useInfiniteQuery({
    queryKey: customerKeys.list({ search }),
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined
      return customersApi.list({ cursor, pageSize: PAGE_SIZE, search })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CursorPaginatedResponse<CustomerDTO>) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 120_000,
  })
}

export const useCreateCustomer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateCustomerDTO, 'id'>) => customersApi.sync({ id: uuidv4(), ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}
