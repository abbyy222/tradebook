import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import type { CreateSalespersonDTO, UpdateSalespersonDTO } from '@tradebook/shared-types'

export const teamKeys = {
  all: ['team'] as const,
  salespeople: () => [...teamKeys.all, 'salespeople'] as const,
}

export const useSalespeople = () => {
  return useQuery({
    queryKey: teamKeys.salespeople(),
    queryFn: authApi.listSalespeople,
    staleTime: 30_000,
  })
}

export const useCreateSalesperson = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSalespersonDTO) => authApi.createSalesperson(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.salespeople() })
    },
  })
}

export const useUpdateSalesperson = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ salespersonId, input }: { salespersonId: string; input: UpdateSalespersonDTO }) =>
      authApi.updateSalesperson(salespersonId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.salespeople() })
    },
  })
}

export const useDeleteSalesperson = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (salespersonId: string) => authApi.deleteSalesperson(salespersonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.salespeople() })
    },
  })
}
