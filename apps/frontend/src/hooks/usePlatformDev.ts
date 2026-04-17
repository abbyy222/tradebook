import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformDevApi } from '@/api/platformDev.api'
import { internalAuthApi } from '@/api/internalAuth.api'
import type { CreatePlatformAdminDTO } from '@tradebook/shared-types'

export const platformDevKeys = {
  all: ['platform-dev'] as const,
  overview: () => [...platformDevKeys.all, 'overview'] as const,
  admins: () => [...platformDevKeys.all, 'admins'] as const,
}

export const usePlatformDevOverview = (enabled: boolean) =>
  useQuery({
    queryKey: platformDevKeys.overview(),
    queryFn: platformDevApi.overview,
    staleTime: 20_000,
    enabled,
  })

export const usePlatformAdmins = (enabled: boolean) =>
  useQuery({
    queryKey: platformDevKeys.admins(),
    queryFn: internalAuthApi.listAdmins,
    staleTime: 20_000,
    enabled,
  })

export const useCreatePlatformAdmin = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlatformAdminDTO) => internalAuthApi.createAdmin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformDevKeys.admins() })
    },
  })
}

