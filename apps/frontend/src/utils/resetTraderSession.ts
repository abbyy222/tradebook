import { clearLocalAppData } from '@/db'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'

let resetInFlight: Promise<void> | null = null

export const resetTraderSession = async () => {
  if (resetInFlight) {
    return resetInFlight
  }

  resetInFlight = (async () => {
    useAuthStore.getState().logout()
    useAuthStore.persist.clearStorage()

    await queryClient.cancelQueries()
    queryClient.clear()

    await clearLocalAppData()
  })().finally(() => {
    resetInFlight = null
  })

  return resetInFlight
}
