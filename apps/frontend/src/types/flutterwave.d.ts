export {}

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: {
      public_key: string
      tx_ref: string
      amount: number
      currency: string
      payment_options?: string
      customer: {
        email: string
        phone_number?: string
        name: string
      }
      meta?: Record<string, unknown>
      customizations?: {
        title?: string
        description?: string
        logo?: string
      }
      callback: (response: {
        status?: string
        transaction_id?: number | string
        tx_ref?: string
      }) => void
      onclose?: () => void
    }) => void
  }
}
