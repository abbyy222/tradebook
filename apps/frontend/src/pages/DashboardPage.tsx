import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '@/components/StatCard'
import { RecordSaleWizard } from '@/components/RecordSaleWizard'
import { useDashboardOverview } from '@/hooks/useDashboard'
import { useAuthStore } from '@/stores/authStore'
import type { DebtorDTO, StockItemDTO } from '@tradebook/shared-types'

const fmt = (n: number) =>
  'NGN ' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 10h18M8 3v4m8-4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H20v12H6.5A2.5 2.5 0 0 1 4 15.5v-7Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M20 9h-3a2 2 0 1 0 0 4h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M6.5 6V5.5A2.5 2.5 0 0 1 9 3h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const BoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 3v18M4 7l8 4 8-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PlusCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.6" />
    <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const QuickActionIcon = ({ variant }: { variant: 'expenses' | 'debtors' | 'stock' }) => {
  if (variant === 'expenses') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18M8 14.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }

  if (variant === 'debtors') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 19.5a6 6 0 0 1 11 0M17 8v6m-3-3h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 3v18M4 7l8 4 8-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export const DashboardPage = () => {
  const trader = useAuthStore((s) => s.trader)
  const navigate = useNavigate()
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: overview, isLoading: overviewLoading } = useDashboardOverview()
  const stats = overview?.stats
  const operatingSnapshot = overview?.operatingSnapshot
  const activeDebtors: DebtorDTO[] = overview?.activeDebtors ?? []
  const stockAlerts: StockItemDTO[] = overview?.stockAlerts ?? []

  const name = trader?.businessName ?? trader?.name ?? 'My Business'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)

  return (
    <div className="min-h-screen px-4 pb-8 pt-4 md:px-6 md:pb-10 md:pt-6 xl:px-8">
      <section
        className="relative overflow-hidden rounded-3xl border border-[#c4622d]/20 px-5 py-6 md:px-8 md:py-8"
        style={{
          background:
            'radial-gradient(120% 180% at 0% 0%, rgba(196,98,45,0.34) 0%, rgba(196,98,45,0.06) 45%, rgba(26,15,10,0.55) 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 pattern-dots opacity-50" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.13em] text-[rgba(245,237,224,0.5)]">
              {greeting()}
            </p>
            <h1 className="mt-1 font-display text-[clamp(1.7rem,3.5vw,2.6rem)] font-bold leading-none text-primary wonky">
              {name}
            </h1>
            <p className="mt-2 font-body text-xs text-[rgba(245,237,224,0.45)] md:text-sm">
              {new Date().toLocaleDateString('en-NG', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>

          <button
            aria-label="Profile"
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-[#c04818] to-[#e8a838] font-ui text-sm font-extrabold text-white"
          >
            {initials || 'TB'}
          </button>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's sales"
          value={overviewLoading ? '' : fmt(stats?.today.total ?? 0)}
          trend={
            stats?.today.count
              ? { text: `${stats.today.count} transactions`, positive: true }
              : undefined
          }
          accent="terra"
          icon={<CalendarIcon />}
          isLoading={overviewLoading}
          onClick={() => navigate('/sales?range=TODAY')}
        />
        <StatCard
          label="This week"
          value={overviewLoading ? '' : fmt(stats?.thisWeek.total ?? 0)}
          accent="gold"
          icon={<WalletIcon />}
          isLoading={overviewLoading}
          onClick={() => navigate('/sales?range=LAST_7_DAYS')}
        />
        <StatCard
          label="Debtors"
          value={String(activeDebtors.length)}
          trend={
            activeDebtors.length > 0
              ? { text: 'owe you money', positive: false }
              : { text: 'all clear', positive: true }
          }
          accent={activeDebtors.length > 0 ? 'danger' : 'neutral'}
          icon={<UserIcon />}
          onClick={() => navigate('/debtors')}
        />
        <StatCard
          label="Low stock"
          value={String(stockAlerts.length)}
          subtext={stockAlerts.length ? 'items need restock' : 'stock is fine'}
          accent={stockAlerts.length ? 'danger' : 'neutral'}
          icon={<BoxIcon />}
          onClick={() => navigate('/stock')}
        />
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <p className="label-base mb-3">This month snapshot</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              label="Revenue"
              value={overviewLoading ? '' : fmt(operatingSnapshot?.revenue ?? 0)}
              subtext={operatingSnapshot ? `${operatingSnapshot.salesCount} sales` : undefined}
              accent="gold"
              icon={<WalletIcon />}
              isLoading={overviewLoading}
            />
            <StatCard
              label="Expenses"
              value={overviewLoading ? '' : fmt(operatingSnapshot?.expenseTotal ?? 0)}
              subtext={operatingSnapshot ? `${operatingSnapshot.expenseCount} records` : undefined}
              accent="danger"
              icon={<CalendarIcon />}
              isLoading={overviewLoading}
            />
            <StatCard
              label="Op. Profit/Loss"
              value={overviewLoading ? '' : fmt(operatingSnapshot?.operatingProfit ?? 0)}
              trend={
                operatingSnapshot
                  ? {
                      text:
                        operatingSnapshot.operatingProfit >= 0
                          ? 'operating profit'
                          : 'operating loss',
                      positive: operatingSnapshot.operatingProfit >= 0,
                    }
                  : undefined
              }
              accent={operatingSnapshot && operatingSnapshot.operatingProfit < 0 ? 'danger' : 'terra'}
              icon={<ArrowRightIcon />}
              isLoading={overviewLoading}
            />
            <StatCard
              label="Receivables"
              value={overviewLoading ? '' : fmt(operatingSnapshot?.receivablesTotal ?? 0)}
              subtext={operatingSnapshot ? `${operatingSnapshot.activeDebtorsCount} active debtors` : undefined}
              accent="neutral"
              icon={<UserIcon />}
              isLoading={overviewLoading}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-[#1f130e] p-4 md:grid-cols-2 md:p-5">
            <div>
              <p className="label-base mb-1">Inventory on hand</p>
              <p className="font-display text-xl font-bold text-primary wonky md:text-2xl">
                {overviewLoading ? '...' : fmt(operatingSnapshot?.inventoryValue ?? 0)}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {overviewLoading ? '' : `${operatingSnapshot?.unitsOnHand ?? 0} units on hand`}
              </p>
            </div>
            <div className="md:text-right">
              <p className="label-base mb-1">Expected margin on hand</p>
              <p className="font-display text-lg font-bold text-[#4ecca3] wonky md:text-xl">
                {overviewLoading ? '...' : fmt(operatingSnapshot?.expectedMarginOnHand ?? 0)}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {overviewLoading ? '' : `Retail value ${fmt(operatingSnapshot?.retailValue ?? 0)}`}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <button
            onClick={() => setWizardOpen(true)}
            className="group relative w-full overflow-hidden rounded-3xl border border-[#c4622d]/30 p-5 text-left transition-all duration-150 hover:-translate-y-[1px]"
            style={{
              background:
                'linear-gradient(135deg, rgba(192,72,24,0.3) 0%, rgba(232,168,56,0.15) 100%)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#c04818] to-[#e8a838]">
                <PlusCircleIcon />
              </div>
              <div className="flex-1">
                <p className="font-ui text-base font-extrabold text-primary">Record a sale</p>
                <p className="mt-0.5 text-xs text-secondary">Works offline and syncs automatically</p>
              </div>
              <span className="text-gold transition-transform duration-150 group-hover:translate-x-0.5">
                <ArrowRightIcon />
              </span>
            </div>
          </button>

          <div className="rounded-3xl border border-white/10 bg-[#231510] p-4 md:p-5">
            <p className="label-base mb-3">Quick actions</p>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: 'expenses' as const, label: 'Add expense', to: '/expenses' },
                { icon: 'debtors' as const, label: 'Add debtor', to: '/debtors' },
                { icon: 'stock' as const, label: 'Update stock', to: '/stock' },
              ].map((action) => (
                <button
                  key={action.to}
                  onClick={() => navigate(action.to)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#2d1b14] px-2 py-4 transition-all duration-150 hover:-translate-y-[1px]"
                >
                  <span className="text-[#f0bc5a]">
                    <QuickActionIcon variant={action.icon} />
                  </span>
                  <span className="text-center font-ui text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[rgba(245,237,224,0.56)]">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {stockAlerts.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[rgba(226,75,74,0.22)] bg-[#231510]">
              <div className="flex items-center justify-between border-b border-[rgba(226,75,74,0.12)] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#f87171]" />
                  <p className="font-ui text-sm font-bold text-[#f87171]">Low stock alerts</p>
                </div>
                <button onClick={() => navigate('/stock')} className="font-ui text-xs font-semibold text-gold">
                  View all {'>'}
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {stockAlerts.slice(0, 4).map((item: StockItemDTO) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <span className="font-body text-sm text-primary">{item.itemName}</span>
                    <span className="rounded-full bg-[rgba(226,75,74,0.12)] px-2.5 py-1 font-mono text-xs font-semibold text-[#f87171]">
                      {item.quantity} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {activeDebtors.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#231510]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 md:px-5">
            <p className="font-ui text-sm font-bold text-primary">Owe you money</p>
            <button onClick={() => navigate('/debtors')} className="font-ui text-xs font-semibold text-gold">
              View all {'>'}
            </button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-white/5 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {activeDebtors.slice(0, 4).map((debtor: DebtorDTO) => (
              <button
                key={debtor.id}
                onClick={() => navigate('/debtors')}
                className="flex items-center gap-3 px-4 py-3.5 text-left transition-opacity duration-150 hover:opacity-85"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#e8a838]/20 bg-gradient-to-br from-[rgba(192,72,24,0.4)] to-[rgba(45,58,124,0.4)] font-ui text-xs font-bold text-[#f0bc5a]">
                  {debtor.customerName[0]?.toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-sm font-semibold text-primary">{debtor.customerName}</p>
                  {debtor.dueDate && (
                    <p className="mt-0.5 text-xs text-secondary">
                      Due{' '}
                      {new Date(debtor.dueDate).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  )}
                </div>

                <p className="font-display text-sm font-bold text-[#f87171] wonky md:text-base">
                  {fmt(debtor.balance)}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {wizardOpen && <RecordSaleWizard onClose={() => setWizardOpen(false)} />}
    </div>
  )
}
