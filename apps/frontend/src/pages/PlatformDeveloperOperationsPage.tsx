import { useMemo, useState } from 'react'
import {
  useForcePlatformResync,
  usePlatformDeadLetter,
  usePlatformKillSwitches,
  usePlatformTenantHeatmap,
  useUpdatePlatformKillSwitch,
} from '@/hooks/usePlatformDev'
import { useInternalAuthStore } from '@/stores/internalAuthStore'
import type { PlatformModuleKey } from '@tradebook/shared-types'

const MODULES: PlatformModuleKey[] = ['SALES', 'EXPENSES', 'STOCK', 'DEBTORS', 'SAVINGS', 'SUPPLIERS', 'CUSTOMERS']

const labelForModule = (module: PlatformModuleKey) => {
  switch (module) {
    case 'SALES': return 'Sales'
    case 'EXPENSES': return 'Expenses'
    case 'STOCK': return 'Stock'
    case 'DEBTORS': return 'Debtors'
    case 'SAVINGS': return 'Savings'
    case 'SUPPLIERS': return 'Suppliers'
    case 'CUSTOMERS': return 'Customers'
    default: return module
  }
}

export const PlatformDeveloperOperationsPage = () => {
  const portal = useInternalAuthStore((s) => s.portal)
  const enabled = portal === 'DEVELOPER'

  const [search, setSearch] = useState('')
  const [deadLetterModule, setDeadLetterModule] = useState<PlatformModuleKey | undefined>(undefined)
  const [deadLetterTraderId, setDeadLetterTraderId] = useState('')
  const [selectedModules, setSelectedModules] = useState<PlatformModuleKey[]>(['SALES', 'EXPENSES', 'STOCK'])
  const [forceTraderId, setForceTraderId] = useState('')

  const switches = usePlatformKillSwitches(enabled)
  const heatmap = usePlatformTenantHeatmap({ search: search.trim() || undefined, limit: 25 }, enabled)
  const deadLetter = usePlatformDeadLetter(
    {
      module: deadLetterModule,
      traderId: deadLetterTraderId.trim() || undefined,
      limit: 50,
    },
    enabled
  )

  const updateSwitch = useUpdatePlatformKillSwitch()
  const forceResync = useForcePlatformResync()

  const selectedCount = useMemo(() => selectedModules.length, [selectedModules.length])

  const toggleModuleSelection = (module: PlatformModuleKey) => {
    setSelectedModules((prev) => (prev.includes(module) ? prev.filter((row) => row !== module) : [...prev, module]))
  }

  const handleForceResync = async () => {
    if (selectedModules.length === 0) return
    await forceResync.mutateAsync({
      modules: selectedModules,
      traderId: forceTraderId.trim() || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="label-base">Kill Switches</p>
            <button onClick={() => void switches.refetch()} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">Refresh</button>
          </div>
          <p className="mb-3 text-xs text-secondary">Pause risky write operations per module during incidents or maintenance windows.</p>
          <div className="space-y-2">
            {!switches.data ? (
              <div className="h-24 rounded-xl skeleton" />
            ) : (
              switches.data.switches.map((item) => (
                <div key={item.module} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2">
                  <p className="font-ui text-sm font-bold text-primary">{labelForModule(item.module)}</p>
                  <button
                    disabled={updateSwitch.isPending}
                    onClick={() => updateSwitch.mutate({ module: item.module, enabled: !item.enabled })}
                    className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                    style={{
                      background: item.enabled ? 'rgba(78,204,163,0.12)' : 'rgba(248,113,113,0.12)',
                      color: item.enabled ? '#4ecca3' : '#f87171',
                      border: `1px solid ${item.enabled ? 'rgba(78,204,163,0.28)' : 'rgba(248,113,113,0.28)'}`,
                    }}
                  >
                    {item.enabled ? 'Enabled' : 'Paused'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
          <p className="label-base mb-2">Forced Re-sync Tool</p>
          <p className="mb-3 text-xs text-secondary">Requeue failed records back to pending for selected modules and optionally one business.</p>

          <div className="mb-3">
            <input
              value={forceTraderId}
              onChange={(e) => setForceTraderId(e.target.value)}
              placeholder="Optional trader UUID"
              className="input-base"
            />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MODULES.map((module) => {
              const selected = selectedModules.includes(module)
              return (
                <button
                  key={module}
                  onClick={() => toggleModuleSelection(module)}
                  className="rounded-xl px-2 py-2 text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    background: selected ? 'rgba(232,168,56,0.14)' : 'rgba(255,255,255,0.04)',
                    color: selected ? '#f0bc5a' : 'rgba(245,237,224,0.7)',
                    border: `1px solid ${selected ? 'rgba(232,168,56,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {labelForModule(module)}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => void handleForceResync()}
            disabled={selectedCount === 0 || forceResync.isPending}
            className="btn-primary w-full"
          >
            {forceResync.isPending ? 'Requeueing...' : `Requeue Failed Records (${selectedCount})`}
          </button>

          {forceResync.data ? (
            <div className="mt-3 rounded-xl border border-[rgba(78,204,163,0.3)] bg-[rgba(78,204,163,0.08)] px-3 py-2 text-xs text-[#4ecca3]">
              Requeued {forceResync.data.totalRequeued} failed records.
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="label-base">Tenant Risk Heatmap</p>
            <button onClick={() => void heatmap.refetch()} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">Refresh</button>
          </div>
          <div className="mb-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search business name or phone" className="input-base" />
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {!heatmap.data ? (
              <div className="h-24 rounded-xl skeleton" />
            ) : heatmap.data.items.length === 0 ? (
              <p className="text-sm text-secondary">No businesses match this filter.</p>
            ) : (
              heatmap.data.items.map((row) => (
                <div key={row.traderId} className="rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-ui text-sm font-bold text-primary">{row.businessLabel}</p>
                    <span className="rounded-full border border-[rgba(248,113,113,0.28)] bg-[rgba(248,113,113,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#f87171]">Risk {row.riskScore}</span>
                  </div>
                  <p className="mt-1 text-xs text-secondary">failed {row.failedRecords} | pending {row.pendingRecords} | overdue {row.overdueDebtors}</p>
                  <p className="mt-1 break-all text-[11px] text-secondary">traderId: {row.traderId}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="label-base">Dead-letter Queue</p>
            <button onClick={() => void deadLetter.refetch()} className="btn-ghost !min-h-0 !px-3 !py-1.5 text-[11px] uppercase">Refresh</button>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={deadLetterModule ?? ''}
              onChange={(e) => setDeadLetterModule((e.target.value || undefined) as PlatformModuleKey | undefined)}
              className="input-base !min-h-0 !px-3 !py-2 text-sm"
            >
              <option value="">All modules</option>
              <option value="SALES">Sales</option>
              <option value="EXPENSES">Expenses</option>
              <option value="STOCK">Stock</option>
            </select>
            <input
              value={deadLetterTraderId}
              onChange={(e) => setDeadLetterTraderId(e.target.value)}
              placeholder="Optional trader UUID"
              className="input-base !min-h-0 !px-3 !py-2 text-sm"
            />
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {!deadLetter.data ? (
              <div className="h-24 rounded-xl skeleton" />
            ) : deadLetter.data.records.length === 0 ? (
              <p className="text-sm text-secondary">No failed records currently in dead-letter filters.</p>
            ) : (
              deadLetter.data.records.map((item) => (
                <div key={`${item.module}-${item.recordId}`} className="rounded-xl border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-ui text-xs font-bold text-[#f87171]">{labelForModule(item.module)}</p>
                    <p className="text-[11px] text-secondary">{new Date(item.happenedAt).toLocaleString('en-NG')}</p>
                  </div>
                  <p className="truncate text-sm font-bold text-primary">{item.businessLabel}</p>
                  <p className="break-all text-[11px] text-secondary">record: {item.recordId}</p>
                  <p className="break-all text-[11px] text-secondary">trader: {item.traderId}</p>
                  {item.amount !== null ? <p className="text-[11px] text-secondary">amount: NGN {item.amount.toLocaleString('en-NG')}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
