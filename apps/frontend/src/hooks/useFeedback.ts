import { useMutation } from '@tanstack/react-query'
import { feedbackApi } from '@/api/feedback.api'
import type { SubmitFeedbackDTO } from '@tradebook/shared-types'

export const useSubmitFeedback = () =>
  useMutation({
    mutationFn: (input: SubmitFeedbackDTO) => feedbackApi.submit(input),
  })
