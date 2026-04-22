import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformAdminApi } from '@/api/platformAdmin.api'
import type { PlatformBusinessAccountStatus, PlatformBusinessActivityStatus } from '@tradebook/shared-types'

export const platformAdminKeys = {
  all: ['platform-admin'] as const,
  overview: (days: number) => [...platformAdminKeys.all, 'overview', days] as const,
  businesses: (params: { page: number; pageSize: number; search?: string; status?: PlatformBusinessActivityStatus; sort: 'activity' | 'sales' | 'newest' }) =>
    [...platformAdminKeys.all, 'businesses', params] as const,
  businessActions: (params: { page: number; pageSize: number; traderId?: string }) =>
    [...platformAdminKeys.all, 'business-actions', params] as const,
}

export const repairModules = ['SALES', 'EXPENSES', 'STOCK', 'DEBTORS', 'SAVINGS', 'SUPPLIERS'] as const

export const usePlatformAdminOverview = (days: number, enabled: boolean) =>
  useQuery({
    queryKey: platformAdminKeys.overview(days),
    queryFn: () => platformAdminApi.overview(days),
    staleTime: 60_000,
    enabled,
  })

export const usePlatformBusinessesDirectory = (
  params: { page: number; pageSize: number; search?: string; status?: PlatformBusinessActivityStatus; sort: 'activity' | 'sales' | 'newest' },
  enabled: boolean
) =>
  useQuery({
    queryKey: platformAdminKeys.businesses(params),
    queryFn: () => platformAdminApi.businesses(params),
    staleTime: 30_000,
    enabled,
  })

export const usePlatformBusinessActionLogs = (
  params: { page: number; pageSize: number; traderId?: string },
  enabled: boolean
) =>
  useQuery({
    queryKey: platformAdminKeys.businessActions(params),
    queryFn: () => platformAdminApi.businessActions(params),
    staleTime: 20_000,
    enabled,
  })

export const useUpdatePlatformBusinessStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { traderId: string; accountStatus: PlatformBusinessAccountStatus; reason: string }) =>
      platformAdminApi.updateBusinessStatus(input.traderId, {
        accountStatus: input.accountStatus,
        reason: input.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformAdminKeys.all })
    },
  })
}

export const useRepairPlatformBusiness = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { traderId: string; reason: string }) =>
      platformAdminApi.repairBusinessSync(input.traderId, { reason: input.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformAdminKeys.all })
    },
  })
}
