// src/pages/RegisterPage.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import { PinInput } from '@/components/PinInput'

const registerSchema = z.object({
  name: z.string().min(2, 'Enter your name').max(100),
  businessName: z.string().max(200).optional(),
  phoneNumber: z
    .string()
    .min(10, 'Enter your phone number')
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  pin: z.string().length(4, 'Choose a 4-digit PIN'),
})

type RegisterForm = z.infer<typeof registerSchema>

const Field = ({
  label,
  hint,
  optional,
  error,
  children,
}: {
  label: string
  hint?: string
  optional?: boolean
  error?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <label className="label-base">{label}</label>
      {optional && (
        <span
          className="font-body text-xs font-light"
          style={{ color: 'rgba(245,237,224,0.25)', textTransform: 'none', letterSpacing: 'normal' }}
        >
          optional
        </span>
      )}
    </div>
    {hint && (
      <p className="font-body text-xs -mt-1" style={{ color: 'rgba(245,237,224,0.3)' }}>
        {hint}
      </p>
    )}
    {children}
    {error && (
      <p className="font-ui font-semibold text-xs" style={{ color: '#f87171' }}>
        {error}
      </p>
    )}
  </div>
)

export const RegisterPage = () => {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const [pin, setPin] = useState('')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const handlePinChange = (val: string) => {
    setPin(val)
    setValue('pin', val, { shouldValidate: true })
  }

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data.token, data.trader)
      navigate('/', { replace: true })
    },
  })

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 flex flex-col gap-7 accent-top"
      style={{
        background: 'rgba(36,20,12,0.9)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
    >
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
          Start for free
        </h1>
        <p className="text-secondary font-body text-sm font-light">
          No credit card. No hidden fees. Just your business.
        </p>
      </div>

      <form
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(d => mutation.mutate(d))}
        noValidate
      >
        <Field label="Your name" error={errors.name?.message}>
          <input
            type="text"
            autoComplete="name"
            placeholder="Amaka Okafor"
            className={`input-base ${errors.name ? 'error' : ''}`}
            {...register('name')}
          />
        </Field>

        <Field label="Business name" optional error={undefined}>
          <input
            type="text"
            placeholder="Amaka's Cosmetics"
            className="input-base"
            {...register('businessName')}
          />
        </Field>

        <Field label="Phone number" error={errors.phoneNumber?.message}>
          <div className="relative">
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none"
              style={{ fontSize: '0.85rem' }}
            >
              <span>🇳🇬</span>
              <span className="font-ui font-semibold text-xs" style={{ color: 'rgba(245,237,224,0.35)' }}>
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

        <Field
          label="Choose a PIN"
          hint="You'll use this 4-digit PIN every time you sign in"
          error={errors.pin?.message}
        >
          <PinInput value={pin} onChange={handlePinChange} disabled={mutation.isPending} />
        </Field>

        {mutation.isError && (
          <div
            className="rounded-xl p-4 text-center font-ui font-semibold text-sm"
            style={{
              background: 'rgba(226,75,74,0.08)',
              border: '1px solid rgba(226,75,74,0.2)',
              color: '#f87171',
            }}
          >
            {(mutation.error as any)?.response?.data?.error?.message
              ?? 'Something went wrong. Try again.'}
          </div>
        )}

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full mt-1">
          {mutation.isPending ? (
            <span
              className="rounded-full border-2 border-white/30 border-t-white"
              style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }}
            />
          ) : (
            'Create account →'
          )}
        </button>
      </form>

      <p className="text-center font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold transition-colors duration-150"
          style={{ color: '#e8a838' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}