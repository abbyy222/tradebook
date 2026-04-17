import { internalApiClient } from './internalClient'
import type {
  CreatePlatformAdminDTO,
  InternalAuthResponseDTO,
  InternalLoginDTO,
  InternalUserDTO,
} from '@tradebook/shared-types'

export const internalAuthApi = {
  login: async (data: InternalLoginDTO) => {
    const res = await internalApiClient.post<{ data: InternalAuthResponseDTO }>('/internal-auth/login', data, { timeout: 15000 })
    return res.data.data
  },

  me: async () => {
    const res = await internalApiClient.get<{ data: InternalUserDTO }>('/internal-auth/me')
    return res.data.data
  },

  createAdmin: async (data: CreatePlatformAdminDTO) => {
    const res = await internalApiClient.post<{ data: InternalUserDTO }>('/internal-auth/admins', data)
    return res.data.data
  },

  listAdmins: async () => {
    const res = await internalApiClient.get<{ data: InternalUserDTO[] }>('/internal-auth/admins')
    return res.data.data
  },
}
