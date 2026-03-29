// src/components/RecordSaleWizard.tsx
// The most important UI in the app. A trader uses this 10-30× per day.
// Every millisecond of friction costs real money.
//
// Design choices:
// - Bottom sheet with spring animation (cubic-bezier overshoot)
// - 4 steps each full-height — no scrolling within the wizard
// - Large touch targets throughout
// - Quick-amount chips for common prices (₦500, ₦1000, ₦2000, ₦5000)
// - Payment type cards instead of a dropdown — one tap, not two
// - Confirm step shows a beautiful summary card
// - Success state: Fraunces "Sale recorded!" + animated checkmark ring

import { useState } from 'react'
import { useCreateSale } from '@/hooks/useSales'

interface Props { onClose: () => void }

type Step = 'item' | 'amount' | 'payment' | 'confirm'
type PaymentType = 'CASH' | 'TRANSFER' | 'DEBT'

const STEPS: Step[] = ['item', 'amount', 'payment', 'confirm']
const STEP_LABELS = ['Item', 'Amount', 'Payment', 'Confirm']

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000]

const fmt = (n: number) => '₦' + n.toLocaleString('en-NG')

const PAYMENT_OPTIONS: Array<{
  type: PaymentType
  label: string
  desc: string
  emoji: string
  color: string
  bg: string
}> = [
  {
    type: 'CASH',
    label: 'Cash',
    desc: 'Paid in hand',
    emoji: '💵',
    color: '#4ecca3',
    bg: 'rgba(78,204,163,0.1)',
  },
  {
    type: 'TRANSFER',
    label: 'Transfer',
    desc: 'Bank or mobile money',
    emoji: '📲',
    color: '#7585c8',
    bg: 'rgba(117,133,200,0.1)',
  },
  {
    type: 'DEBT',
    label: 'Credit',
    desc: 'They owe you',
    emoji: '📝',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
  },
]

// Progress step indicator
const ProgressBar = ({ current }: { current: number }) => (
  <div className="flex items-center gap-1.5 mb-8">
    {STEPS.map((_, i) => {
      const isDone   = i < current
      const isActive = i === current
      return (
        <div key={i} className="flex items-center gap-1.5 flex-1">
          <div
            className="flex-1 rounded-full transition-all duration-300"
            style={{
              height: 3,
              background: isDone
                ? 'linear-gradient(90deg, #c04818, #e8a838)'
                : isActive
                  ? '#c4622d'
                  : 'rgba(255,255,255,0.1)',
            }}
          />
          {i < STEPS.length - 1 && (
            <div
              className="rounded-full flex-shrink-0"
              style={{
                width: 6,
                height: 6,
                background: isDone ? '#e8a838' : isActive ? '#c4622d' : 'rgba(255,255,255,0.12)',
                transition: 'background 0.3s ease',
              }}
            />
          )}
        </div>
      )
    })}
  </div>
)

export const RecordSaleWizard = ({ onClose }: Props) => {
  const [step, setStep] = useState<Step>('item')
  const [itemName, setItemName] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH')
  const [success, setSuccess] = useState(false)
  const createSale = useCreateSale()
  const stepIndex = STEPS.indexOf(step)

  const goNext = () => setStep(STEPS[stepIndex + 1])
  const goBack = () => stepIndex === 0 ? onClose() : setStep(STEPS[stepIndex - 1])

  const handleConfirm = async () => {
    await createSale.mutateAsync({
      itemName: itemName.trim(),
      amount: parseFloat(amount),
      paymentType,
      soldAt: new Date().toISOString(),
    })
    setSuccess(true)
    setTimeout(onClose, 2200)
  }

  // ── Success screen ────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end"
        style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg mx-auto rounded-t-3xl px-8 py-12 flex flex-col items-center gap-5 animate-slide-up"
          style={{
            background: '#231510',
            border: '1px solid rgba(255,255,255,0.07)',
            borderBottom: 'none',
            paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Animated check ring */}
          <div className="animate-pop-in">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, #c04818, #e8a838)',
                boxShadow: '0 0 0 12px rgba(196,98,45,0.12), 0 0 0 24px rgba(196,98,45,0.06)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h2
              className="font-display font-bold"
              style={{
                fontSize: '1.75rem',
                letterSpacing: '-0.02em',
                color: '#f5ede0',
                fontVariationSettings: "'WONK' 1, 'opsz' 30",
              }}
            >
              Sale recorded!
            </h2>
            <p className="font-body text-sm mt-1.5" style={{ color: 'rgba(245,237,224,0.4)' }}>
              {navigator.onLine
                ? 'Saved and synced to the cloud'
                : 'Saved locally — will sync when online'}
            </p>
          </div>

          {/* Mini summary */}
          <div
            className="w-full rounded-xl px-5 py-4 flex items-center justify-between"
            style={{ background: '#2e1c14', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.6)' }}>
              {itemName}
            </span>
            <span
              className="font-display font-bold"
              style={{
                fontSize: '1.1rem',
                color: '#e8a838',
                fontVariationSettings: "'WONK' 1",
              }}
            >
              {fmt(parseFloat(amount))}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end animate-fade-in"
      style={{ background: 'rgba(10,5,2,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 animate-slide-up"
        style={{
          background: '#1e1208',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="rounded-full mx-auto mb-5"
          style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }}
        />

        {/* Step label */}
        <div className="flex items-center justify-between mb-4">
          <p
            className="font-ui font-bold uppercase text-xs tracking-widest"
            style={{ color: 'rgba(245,237,224,0.35)' }}
          >
            Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[stepIndex]}
          </p>
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center transition-opacity duration-150 hover:opacity-60"
            style={{
              width: 30,
              height: 30,
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(245,237,224,0.5)',
              fontSize: '1rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <ProgressBar current={stepIndex} />

        {/* ── STEP 1: Item name ──────────────────────────────────────── */}
        {step === 'item' && (
          <div className="flex flex-col gap-5">
            <h2
              className="font-display font-bold"
              style={{
                fontSize: '1.6rem',
                letterSpacing: '-0.02em',
                color: '#f5ede0',
                fontVariationSettings: "'WONK' 1, 'opsz' 30",
              }}
            >
              What did you sell?
            </h2>

            <input
              type="text"
              autoFocus
              maxLength={200}
              placeholder="e.g. Tomatoes, Fabric, Shoes..."
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              className="input-base text-lg"
              style={{ fontSize: '1.05rem', padding: '1rem 1.25rem' }}
            />

            <button
              className="btn-primary"
              disabled={!itemName.trim()}
              onClick={goNext}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── STEP 2: Amount ────────────────────────────────────────── */}
        {step === 'amount' && (
          <div className="flex flex-col gap-5">
            <h2
              className="font-display font-bold"
              style={{
                fontSize: '1.6rem',
                letterSpacing: '-0.02em',
                color: '#f5ede0',
                fontVariationSettings: "'WONK' 1, 'opsz' 30",
              }}
            >
              How much?
            </h2>

            {/* Big amount input */}
            <div
              className="flex items-center gap-3 rounded-xl px-5 py-4"
              style={{
                background: '#2e1c14',
                border: '1.5px solid rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="font-display font-bold flex-shrink-0"
                style={{
                  fontSize: '1.75rem',
                  color: '#f0bc5a',
                  fontVariationSettings: "'WONK' 1",
                }}
              >
                ₦
              </span>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                min="0"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: "'Fraunces', serif",
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  color: '#f5ede0',
                  letterSpacing: '-0.02em',
                  fontVariationSettings: "'WONK' 1",
                  minWidth: 0,
                }}
              />
            </div>

            {/* Quick amount chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="rounded-full px-4 py-2 font-ui font-semibold text-xs transition-all duration-150 active:scale-95"
                  style={{
                    background: amount === String(q)
                      ? 'rgba(232,168,56,0.18)'
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${amount === String(q) ? 'rgba(232,168,56,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: amount === String(q) ? '#f0bc5a' : 'rgba(245,237,224,0.5)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {fmt(q)}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-shrink-0" onClick={goBack}>← Back</button>
              <button
                className="btn-primary flex-1"
                disabled={!amount || parseFloat(amount) <= 0}
                onClick={goNext}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment type ───────────────────────────────── */}
        {step === 'payment' && (
          <div className="flex flex-col gap-5">
            <h2
              className="font-display font-bold"
              style={{
                fontSize: '1.6rem',
                letterSpacing: '-0.02em',
                color: '#f5ede0',
                fontVariationSettings: "'WONK' 1, 'opsz' 30",
              }}
            >
              How did they pay?
            </h2>

            <div className="flex flex-col gap-2.5">
              {PAYMENT_OPTIONS.map(opt => {
                const isSelected = paymentType === opt.type
                return (
                  <button
                    key={opt.type}
                    onClick={() => setPaymentType(opt.type)}
                    className="flex items-center gap-4 rounded-xl p-4 w-full text-left transition-all duration-150 active:scale-98"
                    style={{
                      background: isSelected ? opt.bg : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${isSelected ? opt.color + '55' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="font-ui font-bold text-sm" style={{ color: isSelected ? opt.color : '#f5ede0' }}>
                        {opt.label}
                      </p>
                      <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>
                        {opt.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div
                        className="rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ width: 22, height: 22, background: opt.color }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-shrink-0" onClick={goBack}>← Back</button>
              <button className="btn-primary flex-1" onClick={goNext}>Review →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirm ────────────────────────────────────── */}
        {step === 'confirm' && (
          <div className="flex flex-col gap-5">
            <h2
              className="font-display font-bold"
              style={{
                fontSize: '1.6rem',
                letterSpacing: '-0.02em',
                color: '#f5ede0',
                fontVariationSettings: "'WONK' 1, 'opsz' 30",
              }}
            >
              Confirm sale
            </h2>

            {/* Summary card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#2e1c14' }}
            >
              {[
                { label: 'Item', value: itemName, isAmount: false },
                { label: 'Amount', value: fmt(parseFloat(amount)), isAmount: true },
                {
                  label: 'Payment',
                  value: PAYMENT_OPTIONS.find(o => o.type === paymentType)?.label ?? paymentType,
                  isAmount: false,
                  color: PAYMENT_OPTIONS.find(o => o.type === paymentType)?.color,
                },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <p
                    className="font-ui font-semibold uppercase text-xs tracking-wider"
                    style={{ color: 'rgba(245,237,224,0.35)' }}
                  >
                    {row.label}
                  </p>
                  <p
                    className={row.isAmount ? 'font-display font-bold' : 'font-ui font-semibold text-sm'}
                    style={{
                      color: row.color ?? (row.isAmount ? '#e8a838' : '#f5ede0'),
                      fontSize: row.isAmount ? '1.25rem' : undefined,
                      fontVariationSettings: row.isAmount ? "'WONK' 1" : undefined,
                      letterSpacing: row.isAmount ? '-0.01em' : undefined,
                    }}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-shrink-0" onClick={goBack}>← Back</button>
              <button
                className="btn-primary flex-1"
                disabled={createSale.isPending}
                onClick={handleConfirm}
              >
                {createSale.isPending ? (
                  <span
                    className="rounded-full border-2 border-white/30 border-t-white"
                    style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }}
                  />
                ) : (
                  '✓ Record sale'
                )}
              </button>
            </div>

            {/* Reassurance note */}
            <p
              className="text-center font-body text-xs"
              style={{ color: 'rgba(245,237,224,0.25)' }}
            >
              {navigator.onLine
                ? 'Will save and sync immediately'
                : 'Will save offline and sync when you\'re online'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}