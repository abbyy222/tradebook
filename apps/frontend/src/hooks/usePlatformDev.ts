import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformDevApi } from '@/api/platformDev.api'
import { internalAuthApi } from '@/api/internalAuth.api'
import type { CreatePlatformAdminDTO, PlatformModuleKey } from '@tradebook/shared-types'

export const platformDevKeys = {
  all: ['platform-dev'] as const,
  overview: () => [...platformDevKeys.all, 'overview'] as const,
  admins: () => [...platformDevKeys.all, 'admins'] as const,
  errors: (params: { windowMinutes: number; limit: number; endpoint?: string }) =>
    [...platformDevKeys.all, 'errors', params] as const,
  requests: (params: { windowMinutes: number; limit: number; endpoint?: string }) =>
    [...platformDevKeys.all, 'requests', params] as const,
  syncHealth: () => [...platformDevKeys.all, 'sync-health'] as const,
  killSwitches: () => [...platformDevKeys.all, 'kill-switches'] as const,
  deadLetter: (params: { module?: PlatformModuleKey; traderId?: string; limit?: number }) =>
    [...platformDevKeys.all, 'dead-letter', params] as const,
  tenantHeatmap: (params: { search?: string; limit?: number }) =>
    [...platformDevKeys.all, 'tenant-heatmap', params] as const,
}

export const usePlatformDevOverview = (enabled: boolean) =>
  useQuery({
    queryKey: platformDevKeys.overview(),
    queryFn: platformDevApi.overview,
    staleTime: 60_000,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: false,
    enabled,
  })

export const usePlatformAdmins = (enabled: boolean) =>
  useQuery({
    queryKey: platformDevKeys.admins(),
    queryFn: internalAuthApi.listAdmins,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled,
  })

export const usePlatformDevErrors = (
  params: { windowMinutes: number; limit: number; endpoint?: string },
  enabled: boolean
) =>
  useQuery({
    queryKey: platformDevKeys.errors(params),
    queryFn: () => platformDevApi.errors(params),
    staleTime: 60_000,
    enabled,
    refetchOnWindowFocus: false,
  })

export const usePlatformDevRequests = (
  params: { windowMinutes: number; limit: number; endpoint?: string },
  enabled: boolean
) =>
  useQuery({
    queryKey: platformDevKeys.requests(params),
    queryFn: () => platformDevApi.requests(params),
    staleTime: 60_000,
    enabled,
    refetchOnWindowFocus: false,
  })

export const usePlatformSyncHealth = (enabled: boolean) =>
  useQuery({
    queryKey: platformDevKeys.syncHealth(),
    queryFn: platformDevApi.syncHealth,
    staleTime: 60_000,
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: false,
  })

export const usePlatformKillSwitches = (enabled: boolean) =>
  useQuery({
    queryKey: platformDevKeys.killSwitches(),
    queryFn: platformDevApi.listKillSwitches,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: false,
    enabled,
  })

export const usePlatformDeadLetter = (
  params: { module?: PlatformModuleKey; traderId?: string; limit?: number },
  enabled: boolean
) =>
  useQuery({
    queryKey: platformDevKeys.deadLetter(params),
    queryFn: () => platformDevApi.deadLetter(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled,
  })

export const usePlatformTenantHeatmap = (
  params: { search?: string; limit?: number },
  enabled: boolean
) =>
  useQuery({
    queryKey: platformDevKeys.tenantHeatmap(params),
    queryFn: () => platformDevApi.tenantHeatmap(params),
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: false,
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

export const useUpdatePlatformKillSwitch = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { module: PlatformModuleKey; enabled: boolean }) => platformDevApi.updateKillSwitch(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformDevKeys.killSwitches() })
    },
  })
}

export const useForcePlatformResync = () => {
  return useMutation({
    mutationFn: (input: { modules: PlatformModuleKey[]; traderId?: string }) => platformDevApi.forceResync(input),
  })
}
