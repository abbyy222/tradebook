import { internalApiClient } from './internalClient'
import type {
  PlatformAdminOverviewDTO,
  PlatformBusinessAccountStatus,
  PlatformBusinessActionLogsDTO,
  PlatformBusinessesDirectoryDTO,
  PlatformBusinessActivityStatus,
} from '@tradebook/shared-types'

export const platformAdminApi = {
  overview: async (days = 14) => {
    const res = await internalApiClient.get<{ data: PlatformAdminOverviewDTO }>('/platform-admin/overview', {
      params: { days },
    })
    return res.data.data
  },
  businesses: async (params: {
    page?: number
    pageSize?: number
    search?: string
    status?: PlatformBusinessActivityStatus
    sort?: 'activity' | 'sales' | 'newest'
  }) => {
    const res = await internalApiClient.get<{ data: PlatformBusinessesDirectoryDTO }>('/platform-admin/businesses', {
      params,
    })
    return res.data.data
  },
  updateBusinessStatus: async (traderId: string, input: { accountStatus: PlatformBusinessAccountStatus; reason: string }) => {
    const res = await internalApiClient.patch<{ data: { traderId: string; accountStatus: PlatformBusinessAccountStatus; reason: string; updatedAt: string } }>(
      `/platform-admin/businesses/${traderId}/status`,
      input
    )
    return res.data.data
  },
  businessActions: async (params: { page?: number; pageSize?: number; traderId?: string }) => {
    const res = await internalApiClient.get<{ data: PlatformBusinessActionLogsDTO }>('/platform-admin/business-actions', { params })
    return res.data.data
  },
}
