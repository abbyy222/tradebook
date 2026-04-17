import { internalApiClient } from './internalClient'
import type { PlatformDevOverviewDTO } from '@tradebook/shared-types'

export const platformDevApi = {
  overview: async () => {
    const res = await internalApiClient.get<{ data: PlatformDevOverviewDTO }>('/platform-dev/overview')
    return res.data.data
  },
}

