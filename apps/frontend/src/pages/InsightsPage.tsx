import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useBusinessInsights, useDeveloperInsights } from '@/hooks/useInsights'

const fmtMoney = (value: number) => `NGN ${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

const MetricCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
    <p className="label-base mb-1">{label}</p>
    <p className="font-display text-2xl font-bold text-primary wonky">{value}</p>
    {hint ? <p className="mt-1 text-xs text-secondary">{hint}</p> : null}
  </div>
)

export const InsightsPage = () => {
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
  const [days, setDays] = useState(14)
  const { data: business, isLoading: businessLoading } = useBusinessInsights(days, isOwner)
  const { data: developer, isLoading: developerLoading } = useDeveloperInsights(isOwner)

  const trendPeak = useMemo(() => {
    if (!business?.activityTrend?.length) return 1
    return Math.max(
      ...business.activityTrend.map(
        (row) => row.salesCount + row.expensesCount + row.debtorsCount + row.savingsCount
      ),
      1
    )
  }, [business?.activityTrend])

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-10 md:px-6 md:pb-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-base mb-1">Business Admin + Developer Monitor</p>
            <h1 className="font-display text-3xl font-bold text-primary wonky">Insights Hub</h1>
            <p className="mt-1 text-sm text-secondary">Usage, sync health, and API stability in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className="rounded-full px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-[0.08em]"
                style={{
                  background: option === days ? 'linear-gradient(135deg, #c04818, #e8a838)' : 'rgba(255,255,255,0.04)',
                  color: option === days ? '#fff' : 'rgba(245,237,224,0.68)',
                  border: option === days ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-ui text-sm font-bold uppercase tracking-[0.08em] text-secondary">Business Overview</h2>
          {businessLoading || !business ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="h-24 rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Transactions"
                  value={business.overview.transactionsRecorded.toLocaleString('en-NG')}
                  hint={`Last ${business.period.days} days`}
                />
                <MetricCard label="Money In" value={fmtMoney(business.overview.salesAmount)} />
                <MetricCard label="Expenses" value={fmtMoney(business.overview.expensesAmount)} />
                <MetricCard
                  label="Profit After Expenses"
                  value={fmtMoney(business.overview.operatingProfit)}
                  hint={business.overview.operatingProfit >= 0 ? 'Positive margin' : 'Monitor spending trend'}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
                  <p className="label-base mb-2">Feature Usage</p>
                  <div className="space-y-2.5">
                    {business.featureUsage.map((entry) => {
                      const highest = Math.max(...business.featureUsage.map((item) => item.count), 1)
                      const width = Math.max(8, Math.round((entry.count / highest) * 100))
                      return (
                        <div key={entry.feature} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-ui font-bold text-primary">{entry.feature}</span>
                            <span className="text-secondary">{entry.count.toLocaleString('en-NG')}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${width}%`, background: 'linear-gradient(90deg, #c4622d, #e8a838)' }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
                  <p className="label-base mb-2">Sync Health</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#2b1912] px-3 py-3">
                      <p className="text-xs text-secondary">Pending</p>
                      <p className="mt-1 font-display text-2xl font-bold text-[#9fb0ff]">{business.syncHealth.pending}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#2b1912] px-3 py-3">
                      <p className="text-xs text-secondary">Failed</p>
                      <p className="mt-1 font-display text-2xl font-bold text-[#f87171]">{business.syncHealth.failed}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-secondary">
                    <p>Team members: <span className="text-primary">{business.overview.teamSize}</span></p>
                    <p>Customers: <span className="text-primary">{business.overview.customers}</span></p>
                    <p>Suppliers: <span className="text-primary">{business.overview.suppliers}</span></p>
                    <p>Active debtors: <span className="text-primary">{business.overview.activeDebtors}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
                <p className="label-base mb-3">Daily Activity Trend</p>
                <div className="space-y-2">
                  {business.activityTrend.map((row) => {
                    const total = row.salesCount + row.expensesCount + row.debtorsCount + row.savingsCount
                    const width = Math.max(6, Math.round((total / trendPeak) * 100))
                    return (
                      <div key={row.date} className="grid grid-cols-[80px_1fr_auto] items-center gap-2">
                        <p className="font-mono text-[11px] text-secondary">{row.date.slice(5)}</p>
                        <div className="h-2 rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${width}%`, background: 'linear-gradient(90deg, #5f8cff, #4ecca3)' }}
                          />
                        </div>
                        <p className="text-xs text-primary">{total}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-ui text-sm font-bold uppercase tracking-[0.08em] text-secondary">Developer Health</h2>
          {developerLoading || !developer ? (
            <div className="h-28 rounded-2xl skeleton" />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
                <p className="label-base mb-2">Runtime</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-secondary">Uptime</p>
                  <p className="text-right text-primary">{Math.floor(developer.uptimeSeconds / 60)} min</p>
                  <p className="text-secondary">Requests (1h)</p>
                  <p className="text-right text-primary">{developer.requestsLastHour}</p>
                  <p className="text-secondary">Server errors (1h)</p>
                  <p className="text-right text-primary">{developer.serverErrorsLastHour}</p>
                  <p className="text-secondary">Error rate</p>
                  <p className="text-right text-primary">{developer.errorRatePercent}%</p>
                  <p className="text-secondary">Avg response</p>
                  <p className="text-right text-primary">{developer.avgResponseMs} ms</p>
                  <p className="text-secondary">P95 response</p>
                  <p className="text-right text-primary">{developer.p95ResponseMs} ms</p>
                  <p className="text-secondary">DB status</p>
                  <p className="text-right" style={{ color: developer.database.ok ? '#4ecca3' : '#f87171' }}>
                    {developer.database.ok
                      ? `Healthy (${developer.database.latencyMs ?? 0} ms)`
                      : 'Unreachable'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
                <p className="label-base mb-2">Slow Endpoints</p>
                <div className="space-y-2">
                  {developer.topSlowEndpoints.length === 0 ? (
                    <p className="text-sm text-secondary">No traffic yet in this runtime window.</p>
                  ) : (
                    developer.topSlowEndpoints.map((entry) => (
                      <div key={entry.endpoint} className="rounded-xl border border-white/10 bg-[#2b1912] px-3 py-2">
                        <p className="font-mono text-[11px] text-primary">{entry.endpoint}</p>
                        <p className="mt-1 text-xs text-secondary">
                          avg {entry.avgDurationMs}ms | max {entry.maxDurationMs}ms | {entry.requests} req
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

