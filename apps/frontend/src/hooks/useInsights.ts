import { useQuery } from '@tanstack/react-query'
import { insightsApi } from '@/api/insights.api'

export const insightsKeys = {
  all: ['insights'] as const,
  business: (days: number) => [...insightsKeys.all, 'business', days] as const,
  developer: () => [...insightsKeys.all, 'developer'] as const,
}

export const useBusinessInsights = (days: number, enabled: boolean) => {
  return useQuery({
    queryKey: insightsKeys.business(days),
    queryFn: () => insightsApi.getBusiness(days),
    staleTime: 60_000,
    enabled,
  })
}

export const useDeveloperInsights = (enabled: boolean) => {
  return useQuery({
    queryKey: insightsKeys.developer(),
    queryFn: insightsApi.getDeveloper,
    staleTime: 30_000,
    enabled,
  })
}

