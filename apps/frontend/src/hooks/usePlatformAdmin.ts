import { useQuery } from '@tanstack/react-query'
import { platformAdminApi } from '@/api/platformAdmin.api'
import type { PlatformBusinessActivityStatus } from '@tradebook/shared-types'

export const platformAdminKeys = {
  all: ['platform-admin'] as const,
  overview: (days: number) => [...platformAdminKeys.all, 'overview', days] as const,
  businesses: (params: { page: number; pageSize: number; search?: string; status?: PlatformBusinessActivityStatus; sort: 'activity' | 'sales' | 'newest' }) =>
    [...platformAdminKeys.all, 'businesses', params] as const,
}

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
