import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MarketHeroCarousel } from '@/components/MarketHeroCarousel'
import { StatCard } from '@/components/StatCard'
import { RecordSaleWizard } from '@/components/RecordSaleWizard'
import { useCloseBusinessDay, useDashboardOverview } from '@/hooks/useDashboard'
import { useAuthStore } from '@/stores/authStore'
import {
  downloadDayCloseSummary,
  printDayCloseSummary,
  shareDayCloseSummary,
} from '@/utils/dayClose'
import type { DayCloseSummaryDTO, DebtorDTO, StockItemDTO } from '@tradebook/shared-types'

const fmt = (n: number) =>
  'NGN ' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const buildDayCloseSignals = (summary: DayCloseSummaryDTO) => {
  const grossEligibleBeforeSavings = summary.net.eligibleSalesAfterExpenses
  const signals: Array<{ tone: 'good' | 'watch'; text: string }> = []

  if (summary.sales.count === 0) {
    signals.push({ tone: 'watch', text: 'No sales have been recorded yet today.' })
  } else {
    signals.push({
      tone: 'good',
      text: `${summary.sales.count} sale${summary.sales.count === 1 ? '' : 's'} captured for today.`,
    })
  }

  if (summary.expenses.total > summary.sales.total) {
    signals.push({ tone: 'watch', text: 'Today’s expenses are higher than today’s sales.' })
  } else if (summary.expenses.total > 0) {
    signals.push({
      tone: 'good',
      text: `Expenses are still within today’s sales range at ${fmt(summary.expenses.total)}.`,
    })
  }

  if (summary.savings.total === 0 && grossEligibleBeforeSavings > 0) {
    signals.push({ tone: 'watch', text: 'You still have room to record savings from today’s net sales.' })
  } else if (summary.savings.total > 0) {
    signals.push({
      tone: 'good',
      text: `${summary.savings.count} savings entr${summary.savings.count === 1 ? 'y is' : 'ies are'} already logged today.`,
    })
  }

  if (summary.collections.total > 0) {
    signals.push({
      tone: 'good',
      text: `${fmt(summary.collections.total)} collected back from debtors today.`,
    })
  }

  return signals.slice(0, 4)
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

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 16v-4a6 6 0 1 1 12 0v4l2 2H4l2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const MoonLedgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M5 18.5h8M5 14.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const SparkCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m6.5 12 3.2 3.2L17.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 3.5v3M20.5 5h-3M4.5 4.5v2M5.5 5.5h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const QuickActionIcon = ({ variant }: { variant: 'expenses' | 'debtors' | 'stock' | 'team' }) => {
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

  if (variant === 'team') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 19a4.8 4.8 0 0 1 9 0M11.5 19a4.8 4.8 0 0 1 9 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

const DayCloseSheet = ({
  summary,
  onClose,
}: {
  summary: DayCloseSummaryDTO
  onClose: () => void
}) => {
  const signals = buildDayCloseSignals(summary)
  const grossEligibleBeforeSavings = summary.net.eligibleSalesAfterExpenses

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 pt-6 sm:px-4 md:items-center md:p-6"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#1a100c] shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative overflow-hidden border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(192,72,24,0.22) 0%, rgba(232,168,56,0.12) 42%, rgba(33,20,15,0.92) 100%), url('/market-scenes/dashboard-market-3.jpg') center/cover",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,168,56,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(196,98,45,0.18),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="label-base mb-2">Day Close Ritual</p>
              <h2 className="font-display text-[1.8rem] font-bold leading-[0.95] text-primary wonky sm:text-[2.1rem]">
                Close today with clarity
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-secondary">
                Review the money that came in, what left the business, what was collected back, and what was truly saved before the day ends.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 self-start md:min-w-[220px]">
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,13,10,0.68)] px-3 py-3 backdrop-blur-[5px]">
                <p className="label-base mb-1">Net after expenses</p>
                <p className="font-display text-lg font-bold text-[#4ecca3] wonky">{fmt(summary.net.operatingBalance)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,13,10,0.68)] px-3 py-3 backdrop-blur-[5px]">
                <p className="label-base mb-1">Still free to save</p>
                <p className="font-display text-lg font-bold text-[#f0bc5a] wonky">{fmt(summary.net.stillAvailableToSave)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Sales recorded</p>
              <p className="font-display text-2xl font-bold text-primary wonky">{fmt(summary.sales.total)}</p>
              <p className="mt-1 text-xs text-secondary">{summary.sales.count} transaction{summary.sales.count === 1 ? '' : 's'} today</p>
            </div>
            <div className="rounded-2xl border border-[rgba(248,113,113,0.18)] bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Expenses</p>
              <p className="font-display text-2xl font-bold text-[#f87171] wonky">{fmt(summary.expenses.total)}</p>
              <p className="mt-1 text-xs text-secondary">{summary.expenses.count} expense record{summary.expenses.count === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(78,204,163,0.18)] bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Debtor collections</p>
              <p className="font-display text-2xl font-bold text-[#4ecca3] wonky">{fmt(summary.collections.total)}</p>
              <p className="mt-1 text-xs text-secondary">{summary.collections.count} collection{summary.collections.count === 1 ? '' : 's'} received</p>
            </div>
            <div className="rounded-2xl border border-[rgba(232,168,56,0.18)] bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Savings logged</p>
              <p className="font-display text-2xl font-bold text-[#f0bc5a] wonky">{fmt(summary.savings.total)}</p>
              <p className="mt-1 text-xs text-secondary">
                {summary.savings.reconciledCount} reconciled • {summary.savings.verifiedCount} verified
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-[#231510] p-4">
              <div className="flex items-center gap-2">
                <span className="text-[#f0bc5a]">
                  <MoonLedgerIcon />
                </span>
                <p className="font-ui text-sm font-bold text-primary">Cashflow lens for today</p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-[#1d120e] px-3 py-3">
                  <p className="label-base mb-1">Cash sales</p>
                  <p className="font-display text-lg font-bold text-primary wonky">{fmt(summary.sales.cashTotal)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#1d120e] px-3 py-3">
                  <p className="label-base mb-1">Transfer sales</p>
                  <p className="font-display text-lg font-bold text-primary wonky">{fmt(summary.sales.transferTotal)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#1d120e] px-3 py-3">
                  <p className="label-base mb-1">Credit sales</p>
                  <p className="font-display text-lg font-bold text-primary wonky">{fmt(summary.sales.debtTotal)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-[rgba(232,168,56,0.16)] bg-[rgba(232,168,56,0.06)] px-4 py-4">
                <p className="label-base mb-1">What today’s sales can support</p>
                <p className="font-display text-2xl font-bold text-[#f0bc5a] wonky">{fmt(grossEligibleBeforeSavings)}</p>
                <p className="mt-1 text-xs leading-5 text-secondary">
                  This follows your current savings rule: cash + transfer sales, minus today’s expenses, before checking what was saved.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#231510] p-4">
              <div className="flex items-center gap-2">
                <span className="text-[#4ecca3]">
                  <SparkCheckIcon />
                </span>
                <p className="font-ui text-sm font-bold text-primary">Close-out read</p>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {signals.map((signal, index) => (
                  <div
                    key={`${signal.text}-${index}`}
                    className="rounded-2xl border px-3.5 py-3"
                    style={{
                      borderColor: signal.tone === 'good' ? 'rgba(78,204,163,0.18)' : 'rgba(240,188,90,0.16)',
                      background: signal.tone === 'good' ? 'rgba(78,204,163,0.06)' : 'rgba(232,168,56,0.06)',
                    }}
                  >
                    <p
                      className="font-body text-sm leading-6"
                      style={{ color: signal.tone === 'good' ? '#b6efd9' : '#f5d28a' }}
                    >
                      {signal.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#c04818] to-[#e8a838] px-4 py-3 font-ui text-sm font-bold text-white"
                >
                  Done for today
                </button>
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl border border-white/10 bg-[#1d120e] px-4 py-3 font-ui text-sm font-bold text-secondary"
                >
                  Review later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const buildDashboardDayCloseSignals = (summary: DayCloseSummaryDTO) => {
  const grossEligibleBeforeSavings = summary.net.eligibleSalesAfterExpenses
  const signals: Array<{ tone: 'good' | 'watch'; text: string }> = []

  if (summary.sales.count === 0) {
    signals.push({ tone: 'watch', text: 'No sales have been recorded yet today.' })
  } else {
    signals.push({
      tone: 'good',
      text: `${summary.sales.count} sale${summary.sales.count === 1 ? '' : 's'} captured for today.`,
    })
  }

  if (summary.expenses.total > summary.sales.total) {
    signals.push({ tone: 'watch', text: 'Today\'s expenses are higher than today\'s sales.' })
  } else if (summary.expenses.total > 0) {
    signals.push({
      tone: 'good',
      text: `Expenses are still within today\'s sales range at ${fmt(summary.expenses.total)}.`,
    })
  }

  if (summary.savings.total === 0 && grossEligibleBeforeSavings > 0) {
    signals.push({ tone: 'watch', text: 'You still have room to record savings from today\'s net sales.' })
  } else if (summary.savings.total > 0) {
    signals.push({
      tone: 'good',
      text: `${summary.savings.count} savings entr${summary.savings.count === 1 ? 'y is' : 'ies are'} already logged today.`,
    })
  }

  if (summary.collections.total > 0) {
    signals.push({
      tone: 'good',
      text: `${fmt(summary.collections.total)} collected back from debtors today.`,
    })
  }

  return signals.slice(0, 4)
}

const DashboardDayCloseSheet = ({
  summary,
  onClose,
}: {
  summary: DayCloseSummaryDTO
  onClose: () => void
}) => {
  const trader = useAuthStore((state) => state.trader)
  const [note, setNote] = useState(summary.closure.note ?? '')
  const closeDay = useCloseBusinessDay()
  const signals = buildDashboardDayCloseSignals(summary)
  const grossEligibleBeforeSavings = summary.net.eligibleSalesAfterExpenses
  const isClosed = summary.closure.isClosed
  const closedAtLabel = summary.closure.closedAt
    ? new Date(summary.closure.closedAt).toLocaleString('en-NG', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const handleCloseDay = async () => {
    await closeDay.mutateAsync(note.trim() || undefined)
    onClose()
  }

  const documentPayload = {
    businessName: trader?.businessName ?? trader?.name ?? 'TradeBook',
    ownerName: trader?.name,
    summary: {
      ...summary,
      closure: {
        ...summary.closure,
        note: note.trim() || summary.closure.note,
      },
    },
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 pt-6 sm:px-4 md:items-center md:p-6"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#1a100c] shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative overflow-hidden border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(192,72,24,0.22) 0%, rgba(232,168,56,0.12) 42%, rgba(33,20,15,0.92) 100%), url('/market-scenes/dashboard-market-3.jpg') center/cover",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,168,56,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(196,98,45,0.18),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="label-base mb-2">Day Close Ritual</p>
              <h2 className="font-display text-[1.8rem] font-bold leading-[0.95] text-primary wonky sm:text-[2.1rem]">
                Close today with clarity
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-secondary">
                Review what came in, what went out, what debtors returned, and what today’s sales can still support for savings before the market sleeps.
              </p>
              {isClosed && closedAtLabel ? (
                <div className="mt-3 inline-flex rounded-full border border-[rgba(78,204,163,0.22)] bg-[rgba(78,204,163,0.1)] px-3 py-1 text-[11px] font-ui font-bold uppercase tracking-[0.08em] text-[#a9efd3]">
                  Closed at {closedAtLabel}
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 self-start md:min-w-[220px]">
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,13,10,0.68)] px-3 py-3 backdrop-blur-[5px]">
                <p className="label-base mb-1">Net after expenses</p>
                <p className="font-display text-lg font-bold text-[#4ecca3] wonky">{fmt(summary.net.operatingBalance)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,13,10,0.68)] px-3 py-3 backdrop-blur-[5px]">
                <p className="label-base mb-1">Still free to save</p>
                <p className="font-display text-lg font-bold text-[#f0bc5a] wonky">{fmt(summary.net.stillAvailableToSave)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Sales recorded</p>
              <p className="font-display text-2xl font-bold text-primary wonky">{fmt(summary.sales.total)}</p>
              <p className="mt-1 text-xs text-secondary">{summary.sales.count} transaction{summary.sales.count === 1 ? '' : 's'} today</p>
            </div>
            <div className="rounded-2xl border border-[rgba(248,113,113,0.18)] bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Expenses</p>
              <p className="font-display text-2xl font-bold text-[#f87171] wonky">{fmt(summary.expenses.total)}</p>
              <p className="mt-1 text-xs text-secondary">{summary.expenses.count} expense record{summary.expenses.count === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(78,204,163,0.18)] bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Debtor collections</p>
              <p className="font-display text-2xl font-bold text-[#4ecca3] wonky">{fmt(summary.collections.total)}</p>
              <p className="mt-1 text-xs text-secondary">{summary.collections.count} collection{summary.collections.count === 1 ? '' : 's'} received</p>
            </div>
            <div className="rounded-2xl border border-[rgba(232,168,56,0.18)] bg-[#231510] px-4 py-4">
              <p className="label-base mb-1">Savings logged</p>
              <p className="font-display text-2xl font-bold text-[#f0bc5a] wonky">{fmt(summary.savings.total)}</p>
              <p className="mt-1 text-xs text-secondary">
                {summary.savings.reconciledCount} reconciled • {summary.savings.verifiedCount} verified
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-[#231510] p-4">
              <div className="flex items-center gap-2">
                <span className="text-[#f0bc5a]">
                  <MoonLedgerIcon />
                </span>
                <p className="font-ui text-sm font-bold text-primary">Cashflow lens for today</p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-[#1d120e] px-3 py-3">
                  <p className="label-base mb-1">Cash sales</p>
                  <p className="font-display text-lg font-bold text-primary wonky">{fmt(summary.sales.cashTotal)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#1d120e] px-3 py-3">
                  <p className="label-base mb-1">Transfer sales</p>
                  <p className="font-display text-lg font-bold text-primary wonky">{fmt(summary.sales.transferTotal)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#1d120e] px-3 py-3">
                  <p className="label-base mb-1">Credit sales</p>
                  <p className="font-display text-lg font-bold text-primary wonky">{fmt(summary.sales.debtTotal)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-[rgba(232,168,56,0.16)] bg-[rgba(232,168,56,0.06)] px-4 py-4">
                <p className="label-base mb-1">What today&apos;s sales can support</p>
                <p className="font-display text-2xl font-bold text-[#f0bc5a] wonky">{fmt(grossEligibleBeforeSavings)}</p>
                <p className="mt-1 text-xs leading-5 text-secondary">
                  This follows your current savings rule: cash + transfer sales, minus today&apos;s expenses, before checking what was saved.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#231510] p-4">
              <div className="flex items-center gap-2">
                <span className="text-[#4ecca3]">
                  <SparkCheckIcon />
                </span>
                <p className="font-ui text-sm font-bold text-primary">Close-out read</p>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {signals.map((signal, index) => (
                  <div
                    key={`${signal.text}-${index}`}
                    className="rounded-2xl border px-3.5 py-3"
                    style={{
                      borderColor: signal.tone === 'good' ? 'rgba(78,204,163,0.18)' : 'rgba(240,188,90,0.16)',
                      background: signal.tone === 'good' ? 'rgba(78,204,163,0.06)' : 'rgba(232,168,56,0.06)',
                    }}
                  >
                    <p
                      className="font-body text-sm leading-6"
                      style={{ color: signal.tone === 'good' ? '#b6efd9' : '#f5d28a' }}
                    >
                      {signal.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <label className="label-base">Close note</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What happened today? Slow morning, restock, cash pressure, strong sales..."
                  rows={4}
                  className="input-base resize-none"
                />
                <p className="text-xs text-secondary">
                  Save a short note so the business remembers the day, not just the numbers.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => {
                    printDayCloseSummary(documentPayload)
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-[#1d120e] px-4 py-3 font-ui text-sm font-bold text-secondary"
                >
                  Print / PDF
                </button>
                <button
                  onClick={() => {
                    void downloadDayCloseSummary(documentPayload)
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-[#1d120e] px-4 py-3 font-ui text-sm font-bold text-secondary"
                >
                  Download
                </button>
              </div>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => void shareDayCloseSummary(documentPayload)}
                  className="w-full rounded-2xl border border-white/10 bg-[#1d120e] px-4 py-3 font-ui text-sm font-bold text-secondary"
                >
                  Share
                </button>
                <button
                  onClick={() => void handleCloseDay()}
                  disabled={closeDay.isPending}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#c04818] to-[#e8a838] px-4 py-3 font-ui text-sm font-bold text-white disabled:opacity-70"
                >
                  {closeDay.isPending ? 'Saving close...' : isClosed ? 'Refresh today close' : 'Close business day'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl border border-white/10 bg-[#1d120e] px-4 py-3 font-ui text-sm font-bold text-secondary"
                >
                  Review later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

void DayCloseSheet

export const DashboardPage = () => {
  const trader = useAuthStore((s) => s.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
  const navigate = useNavigate()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [dayCloseOpen, setDayCloseOpen] = useState(false)

  const { data: overview, isLoading: overviewLoading } = useDashboardOverview()
  const stats = overview?.stats
  const dayClose = overview?.dayClose
  const operatingSnapshot = overview?.operatingSnapshot
  const activeDebtors: DebtorDTO[] = overview?.activeDebtors ?? []
  const stockAlerts: StockItemDTO[] = overview?.stockAlerts ?? []
  const dueReminders = overview?.dueReminders ?? []

  const name = trader?.businessName ?? trader?.name ?? 'My Business'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)

  const todayLabel = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen px-4 pb-8 pt-4 md:px-6 md:pb-10 md:pt-6 xl:px-8">
      <MarketHeroCarousel
        businessName={name}
        greeting={greeting()}
        dateLabel={todayLabel}
        initials={initials || 'TB'}
      />

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {isOwner && dayClose ? (
        <section className="mt-5">
          <button
            onClick={() => setDayCloseOpen(true)}
            className="group relative w-full overflow-hidden rounded-[26px] border border-[rgba(232,168,56,0.14)] px-4 py-4 text-left transition-all duration-150 hover:-translate-y-[1px] sm:px-5 sm:py-5"
            style={{ background: 'linear-gradient(135deg, rgba(192,72,24,0.12) 0%, rgba(232,168,56,0.05) 38%, rgba(35,21,16,0.98) 100%)' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,168,56,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(196,98,45,0.1),transparent_32%)]" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[#f0bc5a]">
                    <MoonLedgerIcon />
                  </span>
                  <p className="font-ui text-xs font-bold uppercase tracking-[0.12em] text-[#f0bc5a]">
                    Day Close
                  </p>
                </div>
                <h3 className="mt-2 font-display text-[1.45rem] font-bold leading-[0.96] text-primary wonky sm:text-[1.7rem]">
                  Review today before the market sleeps
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-secondary">
                  Use the day-close ritual to judge what was truly left after expenses, what came back from debtors, and whether today’s savings still make sense.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-2xl border border-white/10 bg-[rgba(20,13,10,0.52)] px-3 py-3">
                  <p className="label-base mb-1">Net after expenses</p>
                  <p className="font-display text-base font-bold text-[#4ecca3] wonky">{fmt(dayClose.net.operatingBalance)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[rgba(20,13,10,0.52)] px-3 py-3">
                  <p className="label-base mb-1">Saved</p>
                  <p className="font-display text-base font-bold text-[#f0bc5a] wonky">{fmt(dayClose.savings.total)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[rgba(20,13,10,0.52)] px-3 py-3 col-span-2 sm:col-span-1">
                  <p className="label-base mb-1">Still free</p>
                  <p className="font-display text-base font-bold text-[#4ecca3] wonky">{fmt(dayClose.net.stillAvailableToSave)}</p>
                </div>
              </div>
            </div>
          </button>
        </section>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <p className="label-base mb-3">This month summary</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              label="Money in"
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
              label="Profit after expenses"
              value={overviewLoading ? '' : fmt(operatingSnapshot?.operatingProfit ?? 0)}
              trend={
                operatingSnapshot
                  ? {
                      text:
                        operatingSnapshot.operatingProfit >= 0
                          ? 'you are making profit'
                          : 'you are in loss',
                      positive: operatingSnapshot.operatingProfit >= 0,
                    }
                  : undefined
              }
              accent={operatingSnapshot && operatingSnapshot.operatingProfit < 0 ? 'danger' : 'terra'}
              icon={<ArrowRightIcon />}
              isLoading={overviewLoading}
            />
            <StatCard
              label="Customers owing"
              value={overviewLoading ? '' : fmt(operatingSnapshot?.receivablesTotal ?? 0)}
              subtext={operatingSnapshot ? `${operatingSnapshot.activeDebtorsCount} customers owing` : undefined}
              accent="neutral"
              icon={<UserIcon />}
              isLoading={overviewLoading}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-[#1f130e] p-4 md:grid-cols-2 md:p-5">
            <div>
              <p className="label-base mb-1">Goods left in shop</p>
              <p className="font-display text-xl font-bold text-primary wonky md:text-2xl">
                {overviewLoading ? '...' : fmt(operatingSnapshot?.inventoryValue ?? 0)}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {overviewLoading ? '' : `${operatingSnapshot?.unitsOnHand ?? 0} items left`}
              </p>
            </div>
            <div className="md:text-right">
              <p className="label-base mb-1">Possible profit in goods left</p>
              <p className="font-display text-lg font-bold text-[#4ecca3] wonky md:text-xl">
                {overviewLoading ? '...' : fmt(operatingSnapshot?.expectedMarginOnHand ?? 0)}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {overviewLoading ? '' : `If sold today: ${fmt(operatingSnapshot?.retailValue ?? 0)}`}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {dueReminders.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-[rgba(232,168,56,0.3)] bg-[#231510]">
              <div className="flex items-center justify-between border-b border-[rgba(232,168,56,0.16)] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#f0bc5a]">
                    <BellIcon />
                  </span>
                  <p className="font-ui text-sm font-bold text-[#f0bc5a]">Payment reminders</p>
                </div>
                <button onClick={() => navigate('/debtors')} className="font-ui text-xs font-semibold text-gold">
                  Manage {'>'}
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {dueReminders.slice(0, 4).map((item) => {
                  const urgencyLabel =
                    item.urgency === 'OVERDUE'
                      ? 'Overdue'
                      : item.urgency === 'TODAY'
                      ? 'Due today'
                      : `Due in ${item.daysDiff} day${item.daysDiff > 1 ? 's' : ''}`

                  const urgencyColor =
                    item.urgency === 'OVERDUE'
                      ? '#f87171'
                      : item.urgency === 'TODAY'
                      ? '#f0bc5a'
                      : '#9fb0ff'

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate('/debtors')}
                      className="w-full px-4 py-3 text-left transition-opacity duration-150 hover:opacity-85"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-ui text-sm font-semibold text-primary">{item.customerName}</p>
                          <p className="font-body text-xs" style={{ color: urgencyColor }}>{urgencyLabel}</p>
                        </div>
                        <p className="font-display text-sm font-bold text-[#f87171] wonky">{fmt(item.balance)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
            <div className={`grid gap-2.5 ${isOwner ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
              {[
                { icon: 'expenses' as const, label: 'Add expense', to: '/expenses' },
                { icon: 'debtors' as const, label: 'Add debtor', to: '/debtors' },
                { icon: 'stock' as const, label: 'Update stock', to: '/stock' },
                ...(isOwner ? [{ icon: 'team' as const, label: 'Manage team', to: '/team' }] : []),
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

          <div className="flex flex-col divide-y divide-white/5">
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

      {dayCloseOpen && dayClose ? <DashboardDayCloseSheet summary={dayClose} onClose={() => setDayCloseOpen(false)} /> : null}
      {wizardOpen && <RecordSaleWizard onClose={() => setWizardOpen(false)} />}
    </div>
  )
}
