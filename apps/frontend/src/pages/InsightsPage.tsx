import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { MarketSceneBanner } from '@/components/MarketSceneBanner'
import { useAuthStore } from '@/stores/authStore'
import { useBusinessInsights } from '@/hooks/useInsights'

const fmtMoney = (value: number) => `NGN ${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
const fmtPercent = (value: number) => `${value.toFixed(0)}%`

const SectionTitle = ({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="label-base mb-1">{eyebrow}</p>
      <h2 className="font-ui text-lg font-bold text-primary">{title}</h2>
    </div>
    <p className="max-w-md text-left text-xs text-secondary sm:text-right">{note}</p>
  </div>
)

const SignalCard = ({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: 'amber' | 'mint' | 'blue' | 'rose'
}) => {
  const toneStyles = {
    amber: {
      border: 'border-[#e8a838]/25',
      glow: 'from-[#e8a838]/22 via-[#c4622d]/12 to-transparent',
      value: 'text-[#f6d27d]',
    },
    mint: {
      border: 'border-[#4ecca3]/25',
      glow: 'from-[#4ecca3]/20 via-[#2f7c67]/10 to-transparent',
      value: 'text-[#92f0cf]',
    },
    blue: {
      border: 'border-[#7da2ff]/25',
      glow: 'from-[#7da2ff]/20 via-[#435fb7]/10 to-transparent',
      value: 'text-[#bdd0ff]',
    },
    rose: {
      border: 'border-[#f87171]/25',
      glow: 'from-[#f87171]/18 via-[#7f2a2a]/10 to-transparent',
      value: 'text-[#ffb4b4]',
    },
  }[tone]

  return (
    <div className={`relative overflow-hidden rounded-3xl border bg-[#1f130f] px-4 py-4 ${toneStyles.border}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${toneStyles.glow}`} />
      <div className="relative">
        <p className="label-base mb-2">{label}</p>
        <p className={`font-display text-3xl font-bold wonky ${toneStyles.value}`}>{value}</p>
        <p className="mt-2 text-xs leading-5 text-secondary">{hint}</p>
      </div>
    </div>
  )
}

const SmartWarningCard = ({
  warning,
}: {
  warning: {
    severity: 'GOOD' | 'WATCH' | 'RISK'
    title: string
    message: string
    action: string
  }
}) => {
  const tone = {
    GOOD: {
      border: 'border-[#4ecca3]/25',
      bg: 'bg-[rgba(78,204,163,0.08)]',
      text: 'text-[#92f0cf]',
      dot: 'bg-[#4ecca3]',
    },
    WATCH: {
      border: 'border-[#e8a838]/25',
      bg: 'bg-[rgba(232,168,56,0.08)]',
      text: 'text-[#f6d27d]',
      dot: 'bg-[#e8a838]',
    },
    RISK: {
      border: 'border-[#f87171]/25',
      bg: 'bg-[rgba(248,113,113,0.08)]',
      text: 'text-[#ffb4b4]',
      dot: 'bg-[#f87171]',
    },
  }[warning.severity]

  return (
    <div className={`rounded-[24px] border ${tone.border} ${tone.bg} p-4`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${tone.dot}`} />
        <div className="min-w-0">
          <p className={`font-ui text-sm font-bold ${tone.text}`}>{warning.title}</p>
          <p className="mt-1 text-sm leading-6 text-secondary">{warning.message}</p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-[#160d0a] px-3 py-2 text-xs leading-5 text-primary">
            {warning.action}
          </p>
        </div>
      </div>
    </div>
  )
}

const MarketInsightCard = ({
  insight,
}: {
  insight: {
    title: string
    message: string
    metricLabel: string
    metricValue: string
  }
}) => (
  <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#1c120e] p-4">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,168,56,0.12),transparent_34%)]" />
    <div className="relative">
      <div className="mb-3 inline-flex rounded-full border border-[#e8a838]/25 bg-[#e8a838]/10 px-2.5 py-1 text-[10px] font-ui font-bold uppercase tracking-[0.1em] text-[#f6d27d]">
        {insight.metricLabel}: {insight.metricValue}
      </div>
      <p className="font-ui text-base font-bold text-primary">{insight.title}</p>
      <p className="mt-2 text-sm leading-6 text-secondary">{insight.message}</p>
    </div>
  </div>
)

const DebtorTrustCard = ({
  debtor,
}: {
  debtor: {
    customerName: string
    balance: number
    score: number
    risk: 'LOW' | 'MEDIUM' | 'HIGH'
    daysOverdue: number
    recommendation: string
  }
}) => {
  const tone = debtor.risk === 'LOW'
    ? { text: 'text-[#92f0cf]', border: 'border-[#4ecca3]/25', fill: '#4ecca3' }
    : debtor.risk === 'MEDIUM'
      ? { text: 'text-[#f6d27d]', border: 'border-[#e8a838]/25', fill: '#e8a838' }
      : { text: 'text-[#ffb4b4]', border: 'border-[#f87171]/25', fill: '#f87171' }

  return (
    <div className={`rounded-[24px] border ${tone.border} bg-[#1c120e] p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-ui text-sm font-bold text-primary">{debtor.customerName}</p>
          <p className="mt-1 text-xs text-secondary">{fmtMoney(debtor.balance)} still outstanding</p>
        </div>
        <div className="text-right">
          <p className={`font-display text-3xl font-bold wonky ${tone.text}`}>{debtor.score}</p>
          <p className="label-base">trust</p>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/8">
        <div className="h-2 rounded-full" style={{ width: `${debtor.score}%`, background: tone.fill }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-secondary">
        {debtor.daysOverdue > 0 ? `${debtor.daysOverdue} day${debtor.daysOverdue === 1 ? '' : 's'} overdue. ` : ''}
        {debtor.recommendation}
      </p>
    </div>
  )
}

export const InsightsPage = () => {
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
  const [days, setDays] = useState(14)
  const { data: business, isLoading } = useBusinessInsights(days, isOwner)

  const derived = useMemo(() => {
    if (!business) {
      return {
        expenseLoad: 0,
        profitRetention: 0,
        averageTransactionsPerDay: 0,
        topProductShare: 0,
        trendPeak: 1,
      }
    }

    const salesAmount = business.overview.salesAmount
    const topProductRevenue = business.profitability.topProducts.reduce((sum, item) => sum + item.revenue, 0)

    return {
      expenseLoad: salesAmount > 0 ? (business.overview.expensesAmount / salesAmount) * 100 : 0,
      profitRetention: salesAmount > 0 ? (business.overview.operatingProfit / salesAmount) * 100 : 0,
      averageTransactionsPerDay: business.period.days > 0
        ? business.overview.transactionsRecorded / business.period.days
        : 0,
      topProductShare: salesAmount > 0 ? (topProductRevenue / salesAmount) * 100 : 0,
      trendPeak: Math.max(...business.activityTrend.map((row) => row.salesCount), 1),
    }
  }, [business])

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(232,168,56,0.08),_transparent_28%),linear-gradient(180deg,_#140d0a_0%,_#0f0907_100%)] px-4 pb-24 pt-8 md:px-6 md:pb-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <MarketSceneBanner
          image="/market-scenes/dashboard-market-2.jpg"
          eyebrow="Business Analytics"
          title="Insights"
          description="A clearer reading of margin strength, sales rhythm, product winners, and the pressure points shaping cashflow."
          badge="Market reading"
        >
          <div className="flex flex-wrap items-center gap-2">
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
        </MarketSceneBanner>

        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#1c120e] px-5 py-5 shadow-[0_30px_80px_rgba(0,0,0,0.25)] md:px-6">
          {isLoading || !business ? (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="h-24 rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="relative mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-[#251712] px-4 py-4">
                <p className="label-base mb-2">Reading For This Period</p>
                <p className="text-sm leading-6 text-primary">
                  {business.syncHealth.failed > 0
                    ? 'Some records are still unresolved, so use the figures with a bit of caution while you clear failed sync items.'
                    : business.overview.activeDebtors > 0
                      ? 'Sales are moving, but part of your cash is tied up in debtors. Collections will strongly affect the real picture.'
                      : derived.profitRetention > 20
                        ? 'The business is keeping a healthy share of revenue after expenses in this window.'
                        : 'Sales are happening, but margins need attention so more revenue actually stays with the business.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-[#251712] px-4 py-4">
                  <p className="text-xs text-secondary">Transactions/day</p>
                  <p className="mt-2 font-display text-3xl font-bold text-primary wonky">
                    {derived.averageTransactionsPerDay.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#251712] px-4 py-4">
                  <p className="text-xs text-secondary">Top product share</p>
                  <p className="mt-2 font-display text-3xl font-bold text-primary wonky">
                    {fmtPercent(derived.topProductShare)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {isLoading || !business ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-32 rounded-3xl skeleton" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-3 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="relative overflow-hidden rounded-[28px] border border-[#e8a838]/20 bg-[#1c120e] p-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,168,56,0.16),transparent_34%),linear-gradient(135deg,rgba(196,98,45,0.12),transparent_45%)]" />
                <div className="relative">
                  <p className="label-base mb-2">Daily Close Ritual</p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-3xl font-bold leading-[0.95] text-primary wonky">
                        {business.dayCloseRitual.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-secondary">{business.dayCloseRitual.message}</p>
                    </div>
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#e8a838]/25 bg-[#231510]">
                      <span className="font-display text-2xl font-bold text-[#f6d27d] wonky">
                        {business.dayCloseRitual.readinessPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-2">
                    {business.dayCloseRitual.checks.map((check) => (
                      <div key={check.label} className="rounded-2xl border border-white/10 bg-[#160d0a] px-3.5 py-3">
                        <div className="flex items-start gap-3">
                          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${check.complete ? 'bg-[#4ecca3]' : 'bg-[#e8a838]'}`} />
                          <div>
                            <p className="font-ui text-sm font-bold text-primary">{check.label}</p>
                            <p className="mt-0.5 text-xs leading-5 text-secondary">{check.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[#1c120e] p-5">
                <SectionTitle
                  eyebrow="Smart Warnings"
                  title="What TradeBook Wants You To Notice"
                  note="These warnings translate raw records into clear action points before problems become expensive."
                />
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {business.smartWarnings.map((warning) => (
                    <SmartWarningCard key={warning.id} warning={warning} />
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle
                eyebrow="Market Reading"
                title="Human Insights, Not Just Charts"
                note="TradeBook turns sales, product, and cashflow movement into plain-language business readings."
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {business.marketInsights.map((insight) => (
                  <MarketInsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle
                eyebrow="Credit Intelligence"
                title="Debtor Trust Score"
                note="A simple confidence signal for deciding who deserves credit, who needs reminders, and who should pause."
              />
              {business.debtorTrustScores.length === 0 ? (
                <div className="rounded-[28px] border border-white/10 bg-[#1c120e] px-5 py-5">
                  <p className="text-sm text-secondary">No active debtor risk right now. That is a clean place to be.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {business.debtorTrustScores.slice(0, 4).map((debtor) => (
                    <DebtorTrustCard key={debtor.debtorId} debtor={debtor} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <SectionTitle
                eyebrow="Margin View"
                title="Profit Quality"
                note="These are quality signals that show whether the business is simply busy or actually keeping value."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SignalCard
                  label="Gross Margin Estimate"
                  value={fmtMoney(business.profitability.grossMarginEstimate)}
                  hint="Estimated from current item costs against the selling prices already recorded."
                  tone="amber"
                />
                <SignalCard
                  label="Average Sale Value"
                  value={fmtMoney(business.profitability.averageSaleValue)}
                  hint="How much each sale contributes on average."
                  tone="blue"
                />
                <SignalCard
                  label="Expense Load"
                  value={fmtPercent(derived.expenseLoad)}
                  hint="How much of sales value is being consumed by recorded expenses."
                  tone="rose"
                />
                <SignalCard
                  label="Profit Retention"
                  value={fmtPercent(derived.profitRetention)}
                  hint="The share of revenue still left after expenses."
                  tone="mint"
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/10 bg-[#1c120e] px-5 py-5">
                <SectionTitle
                  eyebrow="Sales Flow"
                  title="Sales Rhythm"
                  note="The shape of daily transaction activity tells you whether momentum is building or flattening."
                />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#271915] px-4 py-4">
                    <p className="text-xs text-secondary">Recorded transactions</p>
                    <p className="mt-2 font-display text-3xl font-bold text-primary wonky">
                      {business.overview.transactionsRecorded.toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#271915] px-4 py-4">
                    <p className="text-xs text-secondary">Days reviewed</p>
                    <p className="mt-2 font-display text-3xl font-bold text-primary wonky">
                      {business.period.days}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-[#140d0a] px-4 py-4">
                  {business.activityTrend.map((row) => {
                    const width = Math.max(8, Math.round((row.salesCount / derived.trendPeak) * 100))
                    return (
                      <div key={row.date} className="grid grid-cols-[72px_1fr_auto] items-center gap-3">
                        <p className="font-mono text-[11px] text-secondary">{row.date.slice(5)}</p>
                        <div className="h-2.5 rounded-full bg-white/8">
                          <div
                            className="h-2.5 rounded-full"
                            style={{ width: `${width}%`, background: 'linear-gradient(90deg, #70a3ff, #4ecca3)' }}
                          />
                        </div>
                        <p className="text-xs text-primary">{row.salesCount}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[#1c120e] px-5 py-5">
                <SectionTitle
                  eyebrow="Pressure"
                  title="Business Pressure Points"
                  note="These are the areas most likely to distort cashflow or weaken confidence in the numbers."
                />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ['Active debtors', business.overview.activeDebtors],
                    ['Pending sync', business.syncHealth.pending],
                    ['Failed sync', business.syncHealth.failed],
                    ['Customers', business.overview.customers],
                    ['Suppliers', business.overview.suppliers],
                    ['Team members', business.overview.teamSize],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-[#271915] px-4 py-4">
                      <p className="text-xs text-secondary">{label}</p>
                      <p className="mt-2 font-display text-3xl font-bold text-primary wonky">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle
                eyebrow="Top Performers"
                title="Product Winners"
                note="This section highlights the products that are not just selling, but carrying the strongest profit weight."
              />
              <div className="space-y-3">
                {business.profitability.topProducts.length === 0 ? (
                  <div className="rounded-[28px] border border-white/10 bg-[#1c120e] px-5 py-5">
                    <p className="text-sm text-secondary">No product sales recorded in this period yet.</p>
                  </div>
                ) : (
                  business.profitability.topProducts.map((product, index) => {
                    const marginRate = product.revenue > 0 ? (product.estimatedProfit / product.revenue) * 100 : 0
                    const profitPerUnit = product.unitsSold > 0 ? product.estimatedProfit / product.unitsSold : 0

                    return (
                      <div key={product.itemName} className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#1c120e] px-5 py-5">
                        <div className="absolute right-0 top-0 h-full w-32 bg-[radial-gradient(circle_at_top_right,_rgba(232,168,56,0.12),_transparent_70%)]" />
                        <div className="relative">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="mb-2 inline-flex items-center rounded-full border border-[#e8a838]/25 bg-[#e8a838]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#f6d27d]">
                                #{index + 1} performer
                              </div>
                              <p className="font-ui text-lg font-bold text-primary">{product.itemName}</p>
                              <p className="mt-1 text-sm text-secondary">
                                {product.unitsSold.toLocaleString('en-NG')} units sold in the last {business.period.days} days
                              </p>
                            </div>
                            <div className="rounded-2xl border border-[#4ecca3]/20 bg-[#4ecca3]/8 px-4 py-3 text-right">
                              <p className="text-xs text-secondary">Estimated profit</p>
                              <p
                                className="mt-1 font-display text-2xl font-bold wonky"
                                style={{ color: product.estimatedProfit >= 0 ? '#92f0cf' : '#ffb4b4' }}
                              >
                                {fmtMoney(product.estimatedProfit)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-[#271915] px-4 py-4">
                              <p className="text-xs text-secondary">Revenue</p>
                              <p className="mt-2 font-ui text-base font-bold text-primary">{fmtMoney(product.revenue)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-[#271915] px-4 py-4">
                              <p className="text-xs text-secondary">Margin rate</p>
                              <p className="mt-2 font-ui text-base font-bold text-primary">{fmtPercent(marginRate)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-[#271915] px-4 py-4">
                              <p className="text-xs text-secondary">Profit per unit</p>
                              <p className="mt-2 font-ui text-base font-bold text-primary">{fmtMoney(profitPerUnit)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[#1c120e] px-5 py-5">
              <SectionTitle
                eyebrow="Operational Pattern"
                title="Feature Usage"
                note="This shows where the team is spending the most effort inside the app across this period."
              />
              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {business.featureUsage.map((entry) => {
                  const highest = Math.max(...business.featureUsage.map((item) => item.count), 1)
                  const width = Math.max(10, Math.round((entry.count / highest) * 100))

                  return (
                    <div key={entry.feature} className="rounded-2xl border border-white/10 bg-[#271915] px-4 py-4">
                      <div className="flex items-center justify-between">
                        <p className="font-ui text-sm font-bold text-primary">{entry.feature}</p>
                        <p className="text-sm text-secondary">{entry.count.toLocaleString('en-NG')}</p>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-white/8">
                        <div
                          className="h-2.5 rounded-full"
                          style={{ width: `${width}%`, background: 'linear-gradient(90deg, #c4622d, #e8a838)' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
