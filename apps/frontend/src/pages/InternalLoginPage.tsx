import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { internalAuthApi } from '@/api/internalAuth.api'
import { useInternalAuthStore } from '@/stores/internalAuthStore'

const schema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export const InternalLoginPage = () => {
  const [portal, setPortal] = useState<'ADMIN' | 'DEVELOPER'>('ADMIN')
  const navigate = useNavigate()
  const login = useInternalAuthStore((s) => s.login)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (input: FormValues) =>
      internalAuthApi.login({
        phoneNumber: input.phoneNumber,
        password: input.password,
        portal,
      }),
    onSuccess: (data) => {
      login(data.token, data.user, data.portal)
      navigate(data.portal === 'ADMIN' ? '/platform/admin' : '/platform/dev', { replace: true })
    },
  })

  return (
    <div
      className="w-full rounded-3xl border border-white/10 bg-[rgba(34,18,12,0.92)] p-7 accent-top"
      style={{ backdropFilter: 'blur(14px)' }}
    >
      <div>
        <p className="label-base mb-1">TradeBook Internal</p>
        <h1 className="font-display text-3xl font-bold text-primary wonky">Secure Portal Login</h1>
        <p className="mt-1 text-sm text-secondary">Choose your console and sign in.</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {([
          { id: 'ADMIN' as const, label: 'Admin Portal' },
          { id: 'DEVELOPER' as const, label: 'Developer Console' },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPortal(item.id)}
            className="rounded-xl px-3 py-2 text-xs font-ui font-bold uppercase tracking-[0.08em]"
            style={{
              background: portal === item.id ? 'linear-gradient(135deg, #2354b5, #3f9af5)' : 'rgba(255,255,255,0.04)',
              color: portal === item.id ? '#fff' : 'rgba(245,237,224,0.7)',
              border: portal === item.id ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
        <div>
          <label className="label-base">Phone number</label>
          <input
            type="tel"
            placeholder="0801 234 5678"
            className={`input-base mt-2 ${errors.phoneNumber ? 'error' : ''}`}
            {...register('phoneNumber')}
          />
          {errors.phoneNumber ? <p className="mt-1 text-xs text-[#f87171]">{errors.phoneNumber.message}</p> : null}
        </div>

        <div>
          <label className="label-base">Password</label>
          <input
            type="password"
            placeholder="Enter internal password"
            className={`input-base mt-2 ${errors.password ? 'error' : ''}`}
            {...register('password')}
          />
          {errors.password ? <p className="mt-1 text-xs text-[#f87171]">{errors.password.message}</p> : null}
        </div>

        {mutation.isError ? (
          <div className="rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-sm text-[#f87171]">
            {(mutation.error as any)?.response?.data?.error?.message ?? 'Unable to login right now'}
          </div>
        ) : null}

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? 'Signing in...' : `Enter ${portal === 'ADMIN' ? 'Admin Portal' : 'Developer Console'}`}
        </button>
      </form>
    </div>
  )
}

