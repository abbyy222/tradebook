import { useMemo, useState } from 'react'
import { usePlatformAdminOverview, usePlatformBusinessesDirectory } from '@/hooks/usePlatformAdmin'
import { useInternalAuthStore } from '@/stores/internalAuthStore'
import type { PlatformBusinessActivityStatus } from '@tradebook/shared-types'

const fmtMoney = (value: number) => `NGN ${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

const ACTIVITY_STATUS_THEME: Record<PlatformBusinessActivityStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE: { label: 'Active', color: '#4ecca3', bg: 'rgba(78,204,163,0.12)', border: 'rgba(78,204,163,0.24)' },
  DORMANT: { label: 'Dormant', color: '#f0bc5a', bg: 'rgba(240,188,90,0.12)', border: 'rgba(240,188,90,0.24)' },
  INACTIVE: { label: 'Inactive', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.24)' },
  NEW: { label: 'New', color: '#9fb0ff', bg: 'rgba(159,176,255,0.14)', border: 'rgba(159,176,255,0.26)' },
}

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="min-w-0 rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
    <p className="label-base mb-1">{label}</p>
    <p className="break-words font-display text-xl font-bold text-primary wonky sm:text-2xl">{value}</p>
    {hint ? <p className="mt-1 text-xs text-secondary">{hint}</p> : null}
  </div>
)

export const PlatformAdminPage = () => {
  const portal = useInternalAuthStore((s) => s.portal)
  const [days, setDays] = useState(14)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PlatformBusinessActivityStatus | undefined>(undefined)
  const [sort, setSort] = useState<'activity' | 'sales' | 'newest'>('activity')
  const [page, setPage] = useState(1)

  const overview = usePlatformAdminOverview(days, portal === 'ADMIN')
  const businesses = usePlatformBusinessesDirectory(
    {
      page,
      pageSize: 8,
      search: search || undefined,
      status,
      sort,
    },
    portal === 'ADMIN'
  )

  const peakDaily = useMemo(() => {
    if (!overview.data?.dailyActivity?.length) return 1
    return Math.max(...overview.data.dailyActivity.map((item) => item.salesCount + item.expensesCount), 1)
  }, [overview.data?.dailyActivity])

  const totalPages = businesses.data?.meta.totalPages ?? 1

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label-base mb-1">Company Side</p>
          <h1 className="font-display text-2xl font-bold text-primary wonky sm:text-3xl">Admin Command Center</h1>
          <p className="mt-1 text-xs text-secondary sm:text-sm">User oversight, growth analytics, and platform operations.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[7, 14, 30].map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className="shrink-0 rounded-full px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-[0.08em]"
              style={{
                background: days === option ? 'linear-gradient(135deg, #c04818, #e8a838)' : 'rgba(255,255,255,0.04)',
                color: days === option ? '#fff' : 'rgba(245,237,224,0.68)',
                border: days === option ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      {overview.isLoading || !overview.data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Businesses" value={overview.data.overview.totalBusinesses.toLocaleString('en-NG')} />
            <Stat label="Active Businesses" value={overview.data.overview.activeBusinesses.toLocaleString('en-NG')} hint={`Last ${days} days`} />
            <Stat label="Salespeople" value={overview.data.overview.totalSalespeople.toLocaleString('en-NG')} />
            <Stat label="Transactions Recorded" value={overview.data.overview.transactionsRecorded.toLocaleString('en-NG')} />
            <Stat label="Platform Sales" value={fmtMoney(overview.data.overview.salesAmount)} />
            <Stat label="Platform Expenses" value={fmtMoney(overview.data.overview.expensesAmount)} />
            <Stat label="Net Flow" value={fmtMoney(overview.data.overview.netFlow)} />
            <Stat label="Internal Team" value={`${overview.data.overview.totalInternalAdmins} Admins / ${overview.data.overview.totalPlatformDevelopers} Devs`} />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="label-base">Operations Watch</p>
                <span className="text-[11px] text-secondary">Actionable now</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[rgba(240,188,90,0.24)] bg-[rgba(240,188,90,0.08)] px-3 py-2">
                  <p className="text-[11px] text-secondary">Pending sync</p>
                  <p className="font-ui text-lg font-bold text-[#f0bc5a]">{overview.data.operations.syncPending}</p>
                </div>
                <div className="rounded-xl border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-3 py-2">
                  <p className="text-[11px] text-secondary">Failed sync</p>
                  <p className="font-ui text-lg font-bold text-[#f87171]">{overview.data.operations.syncFailed}</p>
                </div>
                <div className="rounded-xl border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-3 py-2">
                  <p className="text-[11px] text-secondary">Overdue debtors</p>
                  <p className="font-ui text-lg font-bold text-[#f87171]">{overview.data.operations.overdueDebtors}</p>
                </div>
                <div className="rounded-xl border border-[rgba(159,176,255,0.24)] bg-[rgba(159,176,255,0.1)] px-3 py-2">
                  <p className="text-[11px] text-secondary">Recurring due soon</p>
                  <p className="font-ui text-lg font-bold text-[#9fb0ff]">{overview.data.operations.recurringDueSoon}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-2">Module Usage</p>
              <div className="space-y-2.5">
                {overview.data.modulesUsage.map((item) => {
                  const max = Math.max(...overview.data.modulesUsage.map((row) => row.count), 1)
                  const width = Math.max(8, Math.round((item.count / max) * 100))
                  return (
                    <div key={item.module}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-ui font-bold text-primary">{item.module}</span>
                        <span className="text-secondary">{item.count.toLocaleString('en-NG')}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full" style={{ width: `${width}%`, background: 'linear-gradient(90deg, #2f80ed, #56ccf2)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-2">Recent Businesses</p>
              <div className="space-y-2">
                {overview.data.recentBusinesses.map((biz) => (
                  <div key={biz.id} className="rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2">
                    <p className="truncate font-ui text-sm font-bold text-primary">{biz.label}</p>
                    <p className="mt-0.5 text-xs text-secondary">Joined {new Date(biz.createdAt).toLocaleDateString('en-NG')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-2">Daily Platform Activity</p>
              <div className="space-y-2 overflow-x-auto pr-1">
                {overview.data.dailyActivity.map((row) => {
                  const total = row.salesCount + row.expensesCount
                  const width = Math.max(7, Math.round((total / peakDaily) * 100))
                  return (
                    <div key={row.date} className="grid min-w-[260px] grid-cols-[72px_1fr_auto] items-center gap-2">
                      <p className="font-mono text-[11px] text-secondary">{row.date.slice(5)}</p>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full" style={{ width: `${width}%`, background: 'linear-gradient(90deg, #c4622d, #e8a838)' }} />
                      </div>
                      <p className="text-xs text-primary">{total}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="label-base mb-1">User Management</p>
            <h2 className="font-ui text-base font-bold text-primary">Business Directory</h2>
            <p className="text-xs text-secondary">Monitor business health and identify low-activity accounts.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['activity', 'sales', 'newest'] as const).map((option) => (
              <button
                key={option}
                onClick={() => {
                  setSort(option)
                  setPage(1)
                }}
                className="shrink-0 rounded-full px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{
                  background: sort === option ? 'rgba(232,168,56,0.16)' : 'rgba(255,255,255,0.05)',
                  color: sort === option ? '#f0bc5a' : 'rgba(245,237,224,0.7)',
                  border: `1px solid ${sort === option ? 'rgba(232,168,56,0.32)' : 'rgba(255,255,255,0.12)'}`,
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2">
            <input
              className="input-base w-full"
              placeholder="Search business name, owner, or phone"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchDraft.trim())
                  setPage(1)
                }
              }}
            />
            <button
              className="btn-ghost !min-h-0 !shrink-0 !px-3 !py-2 text-xs uppercase"
              onClick={() => {
                setSearch(searchDraft.trim())
                setPage(1)
              }}
            >
              Apply
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setStatus(undefined)
                setPage(1)
              }}
              className="shrink-0 rounded-full whitespace-nowrap px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{
                background: !status ? 'rgba(117,133,200,0.18)' : 'rgba(255,255,255,0.05)',
                color: !status ? '#9fb0ff' : 'rgba(245,237,224,0.68)',
                border: `1px solid ${!status ? 'rgba(117,133,200,0.35)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              All
            </button>
            {(Object.keys(ACTIVITY_STATUS_THEME) as PlatformBusinessActivityStatus[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setStatus(key)
                  setPage(1)
                }}
                className="shrink-0 rounded-full whitespace-nowrap px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{
                  background: status === key ? ACTIVITY_STATUS_THEME[key].bg : 'rgba(255,255,255,0.05)',
                  color: status === key ? ACTIVITY_STATUS_THEME[key].color : 'rgba(245,237,224,0.68)',
                  border: `1px solid ${status === key ? ACTIVITY_STATUS_THEME[key].border : 'rgba(255,255,255,0.12)'}`,
                }}
              >
                {ACTIVITY_STATUS_THEME[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-[rgba(78,204,163,0.2)] bg-[rgba(78,204,163,0.08)] px-3 py-2">
            <p className="text-[11px] text-secondary">Active</p>
            <p className="font-ui text-sm font-bold text-[#4ecca3]">{businesses.data?.summary.active ?? 0}</p>
          </div>
          <div className="rounded-xl border border-[rgba(240,188,90,0.2)] bg-[rgba(240,188,90,0.08)] px-3 py-2">
            <p className="text-[11px] text-secondary">Dormant</p>
            <p className="font-ui text-sm font-bold text-[#f0bc5a]">{businesses.data?.summary.dormant ?? 0}</p>
          </div>
          <div className="rounded-xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-3 py-2">
            <p className="text-[11px] text-secondary">Inactive</p>
            <p className="font-ui text-sm font-bold text-[#f87171]">{businesses.data?.summary.inactive ?? 0}</p>
          </div>
          <div className="rounded-xl border border-[rgba(159,176,255,0.2)] bg-[rgba(159,176,255,0.08)] px-3 py-2">
            <p className="text-[11px] text-secondary">New</p>
            <p className="font-ui text-sm font-bold text-[#9fb0ff]">{businesses.data?.summary.newlyOnboarded ?? 0}</p>
          </div>
        </div>

        {businesses.isLoading || !businesses.data ? (
          <div className="space-y-2">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-20 rounded-xl skeleton" />
            ))}
          </div>
        ) : businesses.data.items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#2a1912] px-4 py-4 text-sm text-secondary">
            No businesses found for this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {businesses.data.items.map((biz) => {
              const statusTheme = ACTIVITY_STATUS_THEME[biz.activityStatus]
              return (
                <div key={biz.id} className="rounded-xl border border-white/10 bg-[#2a1912] px-3 py-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-ui text-sm font-bold text-primary">{biz.label}</p>
                      <p className="mt-0.5 break-all text-xs text-secondary">{biz.ownerName} · {biz.phoneNumber}</p>
                    </div>
                    <span className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: statusTheme.color, background: statusTheme.bg, border: `1px solid ${statusTheme.border}` }}>
                      {statusTheme.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="min-w-0">
                      <p className="text-secondary">Salespeople</p>
                      <p className="truncate font-ui font-bold text-primary">{biz.salespeopleCount}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-secondary">Sales</p>
                      <p className="truncate font-ui font-bold text-primary">{fmtMoney(biz.salesAmount)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-secondary">Expenses</p>
                      <p className="truncate font-ui font-bold text-primary">{fmtMoney(biz.expensesAmount)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-secondary">Receivables</p>
                      <p className="truncate font-ui font-bold text-primary">{fmtMoney(biz.receivablesAmount)}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-secondary">
                    Last activity: {biz.lastActivityAt ? new Date(biz.lastActivityAt).toLocaleString('en-NG') : 'No transactions yet'}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="text-xs text-secondary">
            Page {businesses.data?.meta.page ?? page} of {totalPages} · {businesses.data?.meta.total ?? 0} businesses
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              className="btn-ghost !min-h-0 !flex-1 !px-3 !py-2 text-xs uppercase disabled:opacity-40 sm:!flex-none"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="btn-ghost !min-h-0 !flex-1 !px-3 !py-2 text-xs uppercase disabled:opacity-40 sm:!flex-none"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
