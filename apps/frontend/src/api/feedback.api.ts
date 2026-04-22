import { apiClient } from './client'
import type { SubmitFeedbackDTO, SubmitFeedbackResultDTO } from '@tradebook/shared-types'

export const feedbackApi = {
  submit: async (input: SubmitFeedbackDTO) => {
    const res = await apiClient.post<{ data: SubmitFeedbackResultDTO }>('/feedback', input)
    return res.data.data
  },
}
