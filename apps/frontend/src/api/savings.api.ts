import { apiClient } from './client'
import type {
  CreateSavingsEntryDTO,
  CursorPaginatedResponse,
  ResolveSavingsAccountDTO,
  ResolvedSavingsAccountDTO,
  SavingsAccountDestinationDTO,
  SavingsBankDTO,
  SavingsEntryDTO,
  SavingsTargetDTO,
  SavingsTargetProgressDTO,
  SavingsTransferInitiationDTO,
  SavingsVerificationPreviewDTO,
  UpdateSavingsAccountDestinationDTO,
  UpdateSavingsTargetDTO,
} from '@tradebook/shared-types'

export const savingsApi = {
  sync: async (data: CreateSavingsEntryDTO) => {
    const res = await apiClient.post<{ data: SavingsEntryDTO }>('/savings/sync', data)
    return res.data.data
  },

  list: async (params: { cursor?: string; pageSize?: number; from?: string; to?: string }) => {
    const res = await apiClient.get<CursorPaginatedResponse<SavingsEntryDTO>>('/savings', { params })
    return res.data
  },

  getTodaySummary: async () => {
    const res = await apiClient.get<{ data: { period: { from: string; to: string }; total: number } }>('/savings/summary/today')
    return res.data.data
  },

  getTargetProgress: async () => {
    const res = await apiClient.get<{ data: SavingsTargetProgressDTO }>('/savings/target')
    return res.data.data
  },

  getAccount: async () => {
    const res = await apiClient.get<{ data: SavingsAccountDestinationDTO | null }>('/savings/account')
    return res.data.data
  },

  listBanks: async () => {
    const res = await apiClient.get<{ data: SavingsBankDTO[] }>('/savings/banks')
    return res.data.data
  },

  resolveAccount: async (input: ResolveSavingsAccountDTO) => {
    const res = await apiClient.post<{ data: ResolvedSavingsAccountDTO }>('/savings/account/resolve', input)
    return res.data.data
  },

  updateAccount: async (input: UpdateSavingsAccountDestinationDTO) => {
    const res = await apiClient.patch<{ data: SavingsAccountDestinationDTO }>('/savings/account', input)
    return res.data.data
  },

  getVerificationPreview: async (id: string) => {
    const res = await apiClient.post<{ data: SavingsVerificationPreviewDTO }>(`/savings/${id}/verify`)
    return res.data.data
  },

  initiateVerification: async (id: string) => {
    const res = await apiClient.post<{ data: SavingsTransferInitiationDTO }>(`/savings/${id}/verify/initiate`)
    return res.data.data
  },

  updateTarget: async (input: UpdateSavingsTargetDTO) => {
    const res = await apiClient.patch<{ data: SavingsTargetDTO }>('/savings/target', input)
    return res.data.data
  },
}
