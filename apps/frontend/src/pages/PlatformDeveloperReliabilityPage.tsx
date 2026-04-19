import { useState } from 'react'
import { usePlatformDevErrors, usePlatformDevRequests, usePlatformSyncHealth } from '@/hooks/usePlatformDev'
import { useInternalAuthStore } from '@/stores/internalAuthStore'

export const PlatformDeveloperReliabilityPage = () => {
  const portal = useInternalAuthStore((s) => s.portal)
  const isDevPortal = portal === 'DEVELOPER'
  const [endpointSearch, setEndpointSearch] = useState('')
  const [windowMinutes, setWindowMinutes] = useState(60)
  const [showErrors, setShowErrors] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [showSyncHealth, setShowSyncHealth] = useState(false)

  const errors = usePlatformDevErrors({ windowMinutes, limit: 40, endpoint: endpointSearch || undefined }, isDevPortal && showErrors)
  const requests = usePlatformDevRequests({ windowMinutes, limit: 50, endpoint: endpointSearch || undefined }, isDevPortal && showRequests)
  const syncHealth = usePlatformSyncHealth(isDevPortal && showSyncHealth)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="label-base mb-1">Diagnostics</p>
            <h2 className="font-ui text-base font-bold text-primary">Reliability Explorer</h2>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <input
              value={endpointSearch}
              onChange={(e) => setEndpointSearch(e.target.value)}
              placeholder="Filter endpoint path"
              className="input-base !min-h-0 w-full sm:w-60 !px-3 !py-2 text-sm"
            />
            <select
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value))}
              className="input-base !min-h-0 !w-full sm:!w-auto !px-3 !py-2 text-sm"
            >
              <option value={15}>15m</option>
              <option value={60}>1h</option>
              <option value={180}>3h</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-secondary">Heavy diagnostics are on-demand to keep production request usage low.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="label-base">Recent Error Events</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowErrors((v) => !v)} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">{showErrors ? 'Hide' : 'Load'}</button>
              {showErrors ? <button onClick={() => void errors.refetch()} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">Refresh</button> : null}
            </div>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {!showErrors ? (
              <p className="text-sm text-secondary">Load this panel when incident debugging is needed.</p>
            ) : !errors.data ? (
              <div className="h-20 rounded-xl skeleton" />
            ) : errors.data.events.length === 0 ? (
              <p className="text-sm text-secondary">No 5xx events in selected window.</p>
            ) : (
              errors.data.events.map((event) => (
                <div key={`${event.requestId}-${event.at}`} className="rounded-xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-3 py-2">
                  <p className="break-all font-mono text-[11px] text-primary">{event.endpoint}</p>
                  <p className="mt-1 text-xs text-[#f87171]">{event.status} | {event.durationMs}ms | {new Date(event.at).toLocaleString('en-NG')}</p>
                  <p className="mt-1 break-all text-[11px] text-secondary">requestId: {event.requestId || 'n/a'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="label-base">Request Trace Viewer</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRequests((v) => !v)} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">{showRequests ? 'Hide' : 'Load'}</button>
              {showRequests ? <button onClick={() => void requests.refetch()} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">Refresh</button> : null}
            </div>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {!showRequests ? (
              <p className="text-sm text-secondary">Load this panel only for targeted trace inspection.</p>
            ) : !requests.data ? (
              <div className="h-20 rounded-xl skeleton" />
            ) : requests.data.traces.length === 0 ? (
              <p className="text-sm text-secondary">No request traces in selected window.</p>
            ) : (
              requests.data.traces.map((trace) => (
                <div key={`${trace.requestId}-${trace.at}`} className="rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="break-all font-mono text-[11px] text-primary">{trace.method} {trace.path}</p>
                    <span className="text-[11px] text-secondary">{trace.durationMs}ms</span>
                  </div>
                  <p className="mt-1 text-xs text-secondary">{trace.status} | {new Date(trace.at).toLocaleString('en-NG')}</p>
                  <p className="mt-1 break-all text-[11px] text-secondary">requestId: {trace.requestId || 'n/a'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="label-base">Sync Debug Panel</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSyncHealth((v) => !v)} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">{showSyncHealth ? 'Hide' : 'Load'}</button>
            {showSyncHealth ? <button onClick={() => void syncHealth.refetch()} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">Refresh</button> : null}
          </div>
        </div>

        {!showSyncHealth ? (
          <p className="text-sm text-secondary">Load this panel when investigating sync backlog incidents.</p>
        ) : !syncHealth.data ? (
          <div className="h-24 rounded-xl skeleton" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-[rgba(240,188,90,0.25)] bg-[rgba(240,188,90,0.08)] px-3 py-2"><p className="text-[11px] text-secondary">Pending</p><p className="font-ui text-lg font-bold text-[#f0bc5a]">{syncHealth.data.totals.pending}</p></div>
              <div className="rounded-xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-3 py-2"><p className="text-[11px] text-secondary">Failed</p><p className="font-ui text-lg font-bold text-[#f87171]">{syncHealth.data.totals.failed}</p></div>
              <div className="rounded-xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-3 py-2"><p className="text-[11px] text-secondary">Overdue Debtors</p><p className="font-ui text-lg font-bold text-[#f87171]">{syncHealth.data.operationalRisks.overdueDebtors}</p></div>
              <div className="rounded-xl border border-[rgba(159,176,255,0.24)] bg-[rgba(159,176,255,0.08)] px-3 py-2"><p className="text-[11px] text-secondary">Due Soon</p><p className="font-ui text-lg font-bold text-[#9fb0ff]">{syncHealth.data.operationalRisks.recurringDueSoon}</p></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
