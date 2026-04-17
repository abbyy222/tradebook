import { internalApiClient } from './internalClient'
import type { PlatformAdminOverviewDTO, PlatformBusinessesDirectoryDTO, PlatformBusinessActivityStatus } from '@tradebook/shared-types'

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
}
