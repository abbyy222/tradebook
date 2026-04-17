import { useState } from 'react'
import { useCreatePlatformAdmin, usePlatformAdmins, usePlatformDevOverview } from '@/hooks/usePlatformDev'
import { useInternalAuthStore } from '@/stores/internalAuthStore'

export const PlatformDeveloperPage = () => {
  const portal = useInternalAuthStore((s) => s.portal)
  const { data, isLoading, refetch } = usePlatformDevOverview(portal === 'DEVELOPER')
  const { data: admins } = usePlatformAdmins(portal === 'DEVELOPER')
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-base mb-1">Engineering Side</p>
          <h1 className="font-display text-3xl font-bold text-primary wonky">Developer Console</h1>
          <p className="mt-1 text-sm text-secondary">System health, endpoint performance, and internal access control.</p>
        </div>
        <button onClick={() => void refetch()} className="btn-ghost !min-h-0 !px-4 !py-2 text-xs uppercase">
          Refresh
        </button>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Requests (1h)</p>
              <p className="font-display text-2xl font-bold text-primary wonky">{data.requestsLastHour}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Error Rate</p>
              <p className="font-display text-2xl font-bold text-[#f87171] wonky">{data.errorRatePercent}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">P95 Response</p>
              <p className="font-display text-2xl font-bold text-[#9fb0ff] wonky">{data.p95ResponseMs} ms</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Database</p>
              <p className="font-display text-2xl font-bold wonky" style={{ color: data.database.ok ? '#4ecca3' : '#f87171' }}>
                {data.database.ok ? `${data.database.latencyMs ?? 0} ms` : 'Offline'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-2">Slow Endpoints</p>
              <div className="space-y-2">
                {data.topSlowEndpoints.length === 0 ? (
                  <p className="text-sm text-secondary">No endpoint samples yet.</p>
                ) : (
                  data.topSlowEndpoints.map((entry) => (
                    <div key={entry.endpoint} className="rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2">
                      <p className="font-mono text-[11px] text-primary">{entry.endpoint}</p>
                      <p className="mt-1 text-xs text-secondary">
                        avg {entry.avgDurationMs}ms | max {entry.maxDurationMs}ms | {entry.requests} req
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-2">Error Endpoints</p>
              <div className="space-y-2">
                {data.topErrorEndpoints.length === 0 ? (
                  <p className="text-sm text-secondary">No 5xx endpoints in the last hour.</p>
                ) : (
                  data.topErrorEndpoints.map((entry) => (
                    <div key={entry.endpoint} className="rounded-xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-3 py-2">
                      <p className="font-mono text-[11px] text-primary">{entry.endpoint}</p>
                      <p className="mt-1 text-xs text-[#f87171]">{entry.errors} server errors</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
          <p className="label-base mb-2">Create Platform Admin</p>
          <div className="space-y-3">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Admin full name" className="input-base" />
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Admin phone number" className="input-base" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" className="input-base" type="password" />
            {createAdmin.isError ? (
              <div className="rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-xs text-[#f87171]">
                {(createAdmin.error as any)?.response?.data?.error?.message ?? 'Unable to create admin'}
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
                <p className="font-ui text-sm font-bold text-primary">{admin.fullName}</p>
                <p className="text-xs text-secondary">{admin.phoneNumber}</p>
              </div>
            ))}
            {admins?.length === 0 ? <p className="text-sm text-secondary">No platform admins yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

