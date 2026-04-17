import { apiClient } from './client'
import type { BusinessInsightsDTO, DeveloperInsightsDTO } from '@tradebook/shared-types'

export const insightsApi = {
  getBusiness: async (days = 14) => {
    const res = await apiClient.get<{ data: BusinessInsightsDTO }>('/insights/business', {
      params: { days },
    })
    return res.data.data
  },

  getDeveloper: async () => {
    const res = await apiClient.get<{ data: DeveloperInsightsDTO }>('/insights/developer')
    return res.data.data
  },
}

