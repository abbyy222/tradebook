import { useState } from 'react'
import { useCreatePlatformAdmin, usePlatformAdmins } from '@/hooks/usePlatformDev'
import { useInternalAuthStore } from '@/stores/internalAuthStore'

export const PlatformDeveloperAccessPage = () => {
  const portal = useInternalAuthStore((s) => s.portal)
  const enabled = portal === 'DEVELOPER'

  const { data: admins } = usePlatformAdmins(enabled)
  const createAdmin = useCreatePlatformAdmin()

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')

  const handleCreateAdmin = async () => {
    await createAdmin.mutateAsync({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      password: password.trim(),
    })
    setFullName('')
    setPhoneNumber('')
    setPassword('')
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_1fr]">
      <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
        <p className="label-base mb-2">Create Platform Admin</p>
        <p className="mb-3 text-xs text-secondary">Developer can bootstrap and provision admin-level access for operations staff.</p>

        <div className="space-y-3">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Admin full name" className="input-base" />
          <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Admin phone number" className="input-base" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" className="input-base" type="password" />

          {createAdmin.isError ? (
            <div className="rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-xs text-[#f87171]">
              {(createAdmin.error as any)?.response?.data?.error?.message ?? 'Unable to create admin'}
            </div>
          ) : null}

          {createAdmin.isSuccess ? (
            <div className="rounded-xl border border-[rgba(78,204,163,0.3)] bg-[rgba(78,204,163,0.08)] px-3 py-2 text-xs text-[#4ecca3]">
              Platform admin created successfully.
            </div>
          ) : null}

          <button
            onClick={() => void handleCreateAdmin()}
            disabled={!fullName.trim() || !phoneNumber.trim() || password.trim().length < 8 || createAdmin.isPending}
            className="btn-primary w-full"
          >
            {createAdmin.isPending ? 'Creating admin...' : 'Create Admin Access'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
        <p className="label-base mb-2">Current Platform Admins</p>
        <div className="space-y-2">
          {(admins ?? []).map((admin) => (
            <div key={admin.id} className="rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2">
              <p className="truncate font-ui text-sm font-bold text-primary">{admin.fullName}</p>
              <p className="break-all text-xs text-secondary">{admin.phoneNumber}</p>
            </div>
          ))}
          {admins?.length === 0 ? <p className="text-sm text-secondary">No platform admins yet.</p> : null}
        </div>
      </div>
    </div>
  )
}
