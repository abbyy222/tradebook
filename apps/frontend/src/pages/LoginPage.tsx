// src/pages/LoginPage.tsx
// Clean, focused. The card uses a surface-2 glass with a terracotta top edge.
// Phone number gets a Nigerian flag prefix — small touch, huge local resonance.

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import { PinInput } from '@/components/PinInput'

const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, 'Enter your phone number')
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  pin: z.string().length(4, 'Enter your 4-digit PIN'),
})

type LoginForm = z.infer<typeof loginSchema>

const getLoginErrorMessage = (error: unknown) => {
  const err = error as any
  const apiMessage = err?.response?.data?.error?.message
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage

  if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || !err?.response) {
    return 'Unable to reach the server right now. If this is only happening on this iPhone, reopen the app once so it can pick up the latest TradeBook update.'
  }

  if (err?.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.'
  }

  return 'Something went wrong. Try again.'
}

// Reusable field wrapper — label + input + error
const Field = ({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-2">
    <label className="label-base">{label}</label>
    {children}
    {error && (
      <p className="font-ui font-semibold text-xs" style={{ color: '#f87171' }}>
        {error}
      </p>
    )}
  </div>
)

export const LoginPage = () => {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const [pin, setPin] = useState('')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const handlePinChange = (val: string) => {
    setPin(val)
    setValue('pin', val, { shouldValidate: true })
  }

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.token, data.trader)
      navigate('/', { replace: true })
    },
  })

  return (
    // Card with terracotta top edge accent
    <div
      className="relative overflow-hidden rounded-3xl p-8 flex flex-col gap-7 accent-top"
      style={{
        background: 'rgba(36,20,12,0.9)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Heading */}
      <div>
        <h1
          className="font-display font-bold leading-tight mb-1"
          style={{
            fontSize: '1.9rem',
            letterSpacing: '-0.02em',
            color: '#f5ede0',
            fontVariationSettings: "'WONK' 1, 'opsz' 30",
          }}
        >
          Welcome back
        </h1>
        <p className="text-secondary font-body text-sm font-light">
          Sign in to your TradeBook
        </p>
      </div>

      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(d => mutation.mutate(d))}
        noValidate
      >
        {/* Phone field */}
        <Field label="Phone number" error={errors.phoneNumber?.message}>
          <div className="relative">
            {/* Nigerian flag prefix */}
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none"
              style={{ fontSize: '0.85rem' }}
            >
              <span>🇳🇬</span>
              <span
                className="font-ui font-semibold text-xs"
                style={{ color: 'rgba(245,237,224,0.35)' }}
              >
                +234
              </span>
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0801 234 5678"
              className={`input-base ${errors.phoneNumber ? 'error' : ''}`}
              style={{ paddingLeft: '5.5rem' }}
              {...register('phoneNumber')}
            />
          </div>
        </Field>

        {/* PIN field */}
        <Field label="Your PIN" error={errors.pin?.message}>
          <PinInput
            value={pin}
            onChange={handlePinChange}
            disabled={mutation.isPending}
          />
        </Field>

        {/* API error */}
        {mutation.isError && (
          <div
            className="rounded-xl p-4 text-center font-ui font-semibold text-sm"
            style={{
              background: 'rgba(226,75,74,0.08)',
              border: '1px solid rgba(226,75,74,0.2)',
              color: '#f87171',
            }}
          >
            {getLoginErrorMessage(mutation.error)}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full mt-1"
        >
          {mutation.isPending ? (
            <span
              className="rounded-full border-2 border-white/30 border-t-white"
              style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }}
            />
          ) : (
            'Sign in →'
          )}
        </button>
      </form>

      {/* Switch link */}
      <p className="text-center font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>
        No account?{' '}
        <Link
          to="/register"
          className="font-semibold transition-colors duration-150"
          style={{ color: '#e8a838' }}
        >
          Create one free
        </Link>
      </p>
    </div>
  )
}
