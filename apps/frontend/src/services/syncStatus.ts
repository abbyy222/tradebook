import { isNetworkReachable } from '@/services/networkHealth'

export type SyncStatus = 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'

export const getInitialSyncStatus = (): SyncStatus =>
  isNetworkReachable() ? 'QUEUED' : 'PENDING'

export const isRetryableSyncStatus = (status: SyncStatus) =>
  status === 'QUEUED' || status === 'PENDING' || status === 'FAILED'

export const isQueueSyncStatus = (status: SyncStatus) =>
  status === 'QUEUED' || status === 'PENDING'
