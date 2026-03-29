// src/pages/DashboardPage.tsx
// The morning view. The trader opens this first.
// Design decisions:
// - Header uses a large Fraunces italic for the business name — feels premium
// - Stats grid uses 2x2 layout with varied accent colours
// - Quick actions use a horizontal scroll strip — like market stall offerings
// - Debtor and stock sections use high-contrast rows with avatars
//
// The "market header" pattern: a warm gradient banner at top mirrors
// the awning-and-shadow look of Lagos market stalls.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardOverview } from '@/hooks/useDashboard'
import { useAuthStore } from '@/stores/authStore'
import { StatCard } from '@/components/StatCard'
import { RecordSaleWizard } from '@/components/RecordSaleWizard'

// Naira formatter — ₦84,500 not 84500.00
const fmt = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

// Time-based greeting
const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const DashboardPage = () => {
  const trader = useAuthStore(s => s.trader)
  const navigate = useNavigate()
  const [wizardOpen, setWizardOpen] = useState(false)

  // All queries fire in parallel — TanStack Query handles concurrency
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview()
  const stats = overview?.stats
  const activeDebtors = overview?.activeDebtors ?? []

  const stockAlerts = overview?.stockAlerts ?? []

  const name = trader?.businessName ?? trader?.name ?? 'My Business'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen">

      {/* ── Market stall header ─────────────────────────────────────── */}
      {/* The gradient at top mimics morning light through canvas awning */}
      <div
        className="relative overflow-hidden px-5 pt-12 pb-8"
        style={{
          background:
            'linear-gradient(180deg, rgba(192,72,24,0.15) 0%, rgba(26,15,10,0) 100%)',
        }}
      >
        {/* Pattern overlay — subtle texture */}
        <div className="absolute inset-0 pattern-dots opacity-50 pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between max-w-lg mx-auto">
          <div>
            <p
              className="font-ui font-semibold text-xs uppercase tracking-widest mb-1"
              style={{ color: 'rgba(245,237,224,0.4)' }}
            >
              {greeting()}
            </p>
            {/* Business name — Fraunces italic makes this feel like a brand */}
            <h1
              className="font-display italic font-bold leading-none"
              style={{
                fontSize: 'clamp(1.6rem, 6vw, 2.2rem)',
                letterSpacing: '-0.02em',
                color: '#f5ede0',
                fontVariationSettings: "'WONK' 1, 'opsz' 40",
              }}
            >
              {name}
            </h1>
            {/* Today's date — quick orientation */}
            <p
              className="font-body text-xs mt-1.5"
              style={{ color: 'rgba(245,237,224,0.35)' }}
            >
              {new Date().toLocaleDateString('en-NG', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
          </div>

          {/* Avatar button */}
          <button
            aria-label="Profile"
            className="rounded-full flex items-center justify-center font-ui font-extrabold text-sm flex-shrink-0 transition-transform duration-150 active:scale-90"
            style={{
              width: 46,
              height: 46,
              background: 'linear-gradient(135deg, #c04818, #e8a838)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="px-5 pb-8 flex flex-col gap-7 max-w-lg mx-auto">

        {/* ── Stat cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Today's sales"
            value={overviewLoading ? '' : fmt(stats?.today.total ?? 0)}
            trend={
              stats?.today.count
                ? { text: `${stats.today.count} transactions`, positive: true }
                : undefined
            }
            accent="terra"
            isLoading={overviewLoading}
            onClick={() => navigate('/sales?range=TODAY')}
          />
          <StatCard
            label="This week"
            value={overviewLoading ? '' : fmt(stats?.thisWeek.total ?? 0)}
            accent="gold"
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
            onClick={() => navigate('/debtors')}
          />
          <StatCard
            label="Low stock"
            value={String(stockAlerts?.length ?? 0)}
            subtext={stockAlerts?.length ? 'items need restock' : 'stock is fine'}
            accent={stockAlerts?.length ? 'danger' : 'neutral'}
            onClick={() => navigate('/stock')}
          />
        </div>

        {/* ── Record Sale — the hero CTA ─────────────────────────── */}
        {/* Largest button on the page — traders use this 20× a day  */}
        <button
          onClick={() => setWizardOpen(true)}
          className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-4 w-full text-left"
          style={{
            background: 'linear-gradient(135deg, rgba(192,72,24,0.3) 0%, rgba(232,168,56,0.15) 100%)',
            border: '1px solid rgba(196,98,45,0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {/* Icon circle */}
          <div
            className="rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, #c04818, #e8a838)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" />
              <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="flex-1">
            <p className="font-ui font-extrabold text-base" style={{ color: '#f5ede0' }}>
              Record a sale
            </p>
            <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.45)' }}>
              Works offline — syncs automatically
            </p>
          </div>

          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: '#e8a838', flexShrink: 0 }}>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ── Quick action grid ──────────────────────────────────── */}
        <div>
          <p className="label-base mb-3">Quick actions</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '📤', label: 'Add expense', to: '/expenses' },
              { icon: '👥', label: 'Add debtor',  to: '/debtors'  },
              { icon: '📦', label: 'Update stock', to: '/stock'   },
            ].map(a => (
              <button
                key={a.to}
                onClick={() => navigate(a.to)}
                className="flex flex-col items-center gap-2 rounded-xl py-4 px-2 transition-all duration-150"
                style={{
                  background: '#231510',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
                onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                <span
                  className="font-ui font-bold text-center"
                  style={{ fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.5)' }}
                >
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Low stock alerts ───────────────────────────────────── */}
        {stockAlerts && stockAlerts.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(226,75,74,0.2)', background: '#231510' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(226,75,74,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full"
                  style={{ width: 8, height: 8, background: '#f87171', animation: 'pulse 2s ease infinite', display: 'inline-block' }}
                />
                <p className="font-ui font-bold text-sm" style={{ color: '#f87171' }}>
                  Low stock alerts
                </p>
              </div>
              <button
                onClick={() => navigate('/stock')}
                className="font-ui font-semibold text-xs"
                style={{ color: '#e8a838' }}
              >
                View all →
              </button>
            </div>

            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {stockAlerts.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                  <span className="font-body text-sm" style={{ color: '#f5ede0' }}>
                    {item.itemName}
                  </span>
                  <span
                    className="font-mono font-semibold text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(226,75,74,0.12)', color: '#f87171' }}
                  >
                    {item.quantity} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active debtors preview ─────────────────────────────── */}
        {activeDebtors.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#231510' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p className="font-ui font-bold text-sm" style={{ color: '#f5ede0' }}>
                Owe you money
              </p>
              <button
                onClick={() => navigate('/debtors')}
                className="font-ui font-semibold text-xs"
                style={{ color: '#e8a838' }}
              >
                View all →
              </button>
            </div>

            <div>
              {activeDebtors.slice(0, 4).map((debtor, idx) => (
                <div
                  key={debtor.id}
                  onClick={() => navigate('/debtors')}
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-opacity duration-150 active:opacity-60"
                  style={{
                    borderBottom: idx < Math.min(activeDebtors.length, 4) - 1
                      ? '1px solid rgba(255,255,255,0.04)'
                      : 'none',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="rounded-full flex items-center justify-center font-ui font-bold text-xs flex-shrink-0"
                    style={{
                      width: 38,
                      height: 38,
                      background: 'linear-gradient(135deg, rgba(192,72,24,0.4), rgba(45,58,124,0.4))',
                      color: '#f0bc5a',
                      border: '1px solid rgba(232,168,56,0.2)',
                    }}
                  >
                    {debtor.customerName[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-ui font-semibold text-sm truncate"
                      style={{ color: '#f5ede0' }}
                    >
                      {debtor.customerName}
                    </p>
                    {debtor.dueDate && (
                      <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>
                        Due {new Date(debtor.dueDate).toLocaleDateString('en-NG', {
                          day: 'numeric', month: 'short',
                        })}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <p
                    className="font-display font-bold flex-shrink-0"
                    style={{
                      fontSize: '1rem',
                      letterSpacing: '-0.01em',
                      color: '#f87171',
                      fontVariationSettings: "'WONK' 1",
                    }}
                  >
                    {fmt(debtor.balance)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Record Sale Wizard bottom sheet ───────────────────────── */}
      {wizardOpen && <RecordSaleWizard onClose={() => setWizardOpen(false)} />}
    </div>
  )
}
