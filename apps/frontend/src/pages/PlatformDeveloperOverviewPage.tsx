import { useMemo } from 'react'
import { usePlatformDevOverview } from '@/hooks/usePlatformDev'
import { useInternalAuthStore } from '@/stores/internalAuthStore'

const MetricCard = ({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'warn' | 'danger' | 'info' }) => {
  const color =
    tone === 'good' ? '#4ecca3'
      : tone === 'warn' ? '#f0bc5a'
        : tone === 'danger' ? '#f87171'
          : tone === 'info' ? '#9fb0ff'
            : '#f5ede0'

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
      <p className="label-base mb-1">{label}</p>
      <p className="break-words font-display text-xl font-bold wonky sm:text-2xl" style={{ color }}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-secondary">{hint}</p> : null}
    </div>
  )
}

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export const PlatformDeveloperOverviewPage = () => {
  const portal = useInternalAuthStore((s) => s.portal)
  const enabled = portal === 'DEVELOPER'
  const { data, isLoading, refetch } = usePlatformDevOverview(enabled)

  const status = useMemo(() => {
    if (!data) return { label: 'Loading', color: '#9fb0ff', note: 'Collecting telemetry...' }
    if (!data.database.ok) return { label: 'Database degraded', color: '#f87171', note: 'Database ping is currently failing.' }
    if (data.errorRatePercent >= 5) return { label: 'At risk', color: '#f0bc5a', note: 'Error rate crossed healthy threshold.' }
    return { label: 'Healthy', color: '#4ecca3', note: 'Core services are responsive.' }
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#231510] px-4 py-3">
        <div>
          <p className="font-ui text-sm font-bold" style={{ color: status.color }}>{status.label}</p>
          <p className="text-xs text-secondary">{status.note}</p>
        </div>
        <button onClick={() => void refetch()} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">
          Refresh
        </button>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => <div key={idx} className="h-24 rounded-2xl skeleton" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Requests (1h)" value={data.requestsLastHour.toLocaleString('en-NG')} />
            <MetricCard label="Error Rate" value={`${data.errorRatePercent}%`} tone={data.errorRatePercent >= 5 ? 'warn' : 'good'} />
            <MetricCard label="P95 Response" value={`${data.p95ResponseMs} ms`} tone="info" />
            <MetricCard label="Database" value={data.database.ok ? `${data.database.latencyMs ?? 0} ms` : 'Offline'} tone={data.database.ok ? 'good' : 'danger'} />
            <MetricCard label="Uptime" value={formatUptime(data.uptimeSeconds)} hint={`${Math.floor(data.uptimeSeconds / 60).toLocaleString('en-NG')} mins`} />
            <MetricCard label="Memory RSS" value={`${data.process.rssMb} MB`} />
            <MetricCard label="Heap Used" value={`${data.process.heapUsedMb} MB`} tone="info" />
            <MetricCard label="Internal Access" value={`${data.internalAccess.admins} Admins / ${data.internalAccess.developers} Devs`} />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-2">Slow Endpoints</p>
              <div className="space-y-2">
                {data.topSlowEndpoints.length === 0 ? (
                  <p className="text-sm text-secondary">No endpoint latency samples yet.</p>
                ) : (
                  data.topSlowEndpoints.map((entry) => (
                    <div key={entry.endpoint} className="rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2">
                      <p className="break-all font-mono text-[11px] text-primary">{entry.endpoint}</p>
                      <p className="mt-1 text-xs text-secondary">avg {entry.avgDurationMs}ms | max {entry.maxDurationMs}ms | {entry.requests} req</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.06)] px-4 py-4">
              <p className="label-base mb-2">Error Endpoints</p>
              <div className="space-y-2">
                {data.topErrorEndpoints.length === 0 ? (
                  <p className="text-sm text-secondary">No server-error hotspots in the last hour.</p>
                ) : (
                  data.topErrorEndpoints.map((entry) => (
                    <div key={entry.endpoint} className="rounded-xl border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-3 py-2">
                      <p className="break-all font-mono text-[11px] text-primary">{entry.endpoint}</p>
                      <p className="mt-1 text-xs text-[#f87171]">{entry.errors} server errors</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
