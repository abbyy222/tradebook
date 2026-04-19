import { internalApiClient } from './internalClient'
import type {
  PlatformDeadLetterRecordDTO,
  PlatformDevErrorEventDTO,
  PlatformDevOverviewDTO,
  PlatformDevRequestTraceDTO,
  PlatformDevSyncHealthDTO,
  PlatformForceResyncResultDTO,
  PlatformKillSwitchDTO,
  PlatformModuleKey,
  PlatformTenantRiskDTO,
} from '@tradebook/shared-types'

export const platformDevApi = {
  overview: async () => {
    const res = await internalApiClient.get<{ data: PlatformDevOverviewDTO }>('/platform-dev/overview')
    return res.data.data
  },
  errors: async (params?: { windowMinutes?: number; limit?: number; endpoint?: string }) => {
    const res = await internalApiClient.get<{ data: { events: PlatformDevErrorEventDTO[]; meta: { windowMinutes: number; count: number } } }>(
      '/platform-dev/errors',
      { params }
    )
    return res.data.data
  },
  requests: async (params?: { windowMinutes?: number; limit?: number; endpoint?: string }) => {
    const res = await internalApiClient.get<{ data: { traces: PlatformDevRequestTraceDTO[]; meta: { windowMinutes: number; count: number } } }>(
      '/platform-dev/requests',
      { params }
    )
    return res.data.data
  },
  syncHealth: async () => {
    const res = await internalApiClient.get<{ data: PlatformDevSyncHealthDTO }>('/platform-dev/sync-health')
    return res.data.data
  },
  listKillSwitches: async () => {
    const res = await internalApiClient.get<{ data: { switches: PlatformKillSwitchDTO[] } }>('/platform-dev/kill-switches')
    return res.data.data
  },
  updateKillSwitch: async (input: { module: PlatformModuleKey; enabled: boolean }) => {
    const res = await internalApiClient.patch<{ data: { switches: PlatformKillSwitchDTO[]; updated: PlatformKillSwitchDTO } }>(
      '/platform-dev/kill-switches',
      input
    )
    return res.data.data
  },
  deadLetter: async (params?: { module?: PlatformModuleKey; traderId?: string; limit?: number }) => {
    const res = await internalApiClient.get<{ data: { records: PlatformDeadLetterRecordDTO[]; meta: { count: number } } }>(
      '/platform-dev/dead-letter',
      { params }
    )
    return res.data.data
  },
  tenantHeatmap: async (params?: { search?: string; limit?: number }) => {
    const res = await internalApiClient.get<{ data: { items: PlatformTenantRiskDTO[] } }>('/platform-dev/tenant-heatmap', { params })
    return res.data.data
  },
  forceResync: async (input: { modules: PlatformModuleKey[]; traderId?: string }) => {
    const res = await internalApiClient.post<{ data: PlatformForceResyncResultDTO }>('/platform-dev/force-resync', input)
    return res.data.data
  },
}
