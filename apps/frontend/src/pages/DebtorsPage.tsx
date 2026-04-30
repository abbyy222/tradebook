import { useEffect, useState } from 'react'
import { MarketSceneBanner } from '@/components/MarketSceneBanner'
import { RecordSyncBadge } from '@/components/RecordSyncBadge'
import {
  useDebtorsList,
  useCreateDebtor,
  useRecordPayment,
  useRetryDebtorSync,
  useDebtorStatement,
  useUpdateDebtorSchedule,
} from '@/hooks/useDebtors'
import {
  buildDebtorStatementText,
  downloadDebtorStatement,
  printDebtorStatement,
  shareDebtorStatement,
} from '@/utils/debtorStatement'

const fmt = (n: number) => 'N' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })
const EmptyPeopleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 19a4.8 4.8 0 0 1 9 0M11.5 19a4.8 4.8 0 0 1 9 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
type DebtorTab = 'OWING' | 'CLEARED' | 'ALL'

type DebtorLike = {
  id: string
  customerName: string
  phoneNumber?: string
  balance: number
  status: 'ACTIVE' | 'PARTIAL' | 'CLEARED'
  dueDate?: string
  syncStatus?: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED'
}

type DebtorSuccessState =
  | {
      kind: 'created'
      customerName: string
      totalOwed: number
      dueDate?: string
      queued: boolean
    }
  | {
      kind: 'payment'
      customerName: string
      cleared: boolean
      paymentAmount: number
      remainingBalance: number
    }

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const toDateInputValue = (value?: string | null) => {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseNairaInput = (value: string) => {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return NaN

  const normalized = trimmed.replace(/,/g, '').replace(/\s+/g, '')
  let multiplier = 1
  let numericPart = normalized

  if (normalized.endsWith('k')) {
    multiplier = 1_000
    numericPart = normalized.slice(0, -1)
  } else if (normalized.endsWith('m')) {
    multiplier = 1_000_000
    numericPart = normalized.slice(0, -1)
  }

  const parsed = Number(numericPart)
  if (!Number.isFinite(parsed)) return NaN
  return parsed * multiplier
}

const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const isOverdueDebtor = (debtor: DebtorLike) => {
  if (!debtor.dueDate || debtor.balance <= 0) return false
  return new Date(debtor.dueDate).getTime() < startOfToday().getTime()
}

const isDueSoonDebtor = (debtor: DebtorLike) => {
  if (!debtor.dueDate || debtor.balance <= 0) return false
  const today = startOfToday().getTime()
  const due = new Date(debtor.dueDate).getTime()
  const diffDays = Math.ceil((due - today) / (24 * 60 * 60 * 1000))
  return diffDays >= 0 && diffDays <= 3
}

const buildReminderText = (debtor: DebtorLike) => {
  const dueText = debtor.dueDate
    ? ` Your agreed payment date is ${new Date(debtor.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}.`
    : ''
  return `Hello ${debtor.customerName}, this is a reminder that you still owe ${fmt(debtor.balance)}.${dueText} Please reach out once payment is ready. Thank you.`
}

const sendReminder = async (debtor: DebtorLike) => {
  const text = buildReminderText(debtor)

  if (navigator.share) {
    await navigator.share({
      title: `Payment reminder - ${debtor.customerName}`,
      text,
    })
    return
  }

  if (debtor.phoneNumber) {
    const cleaned = debtor.phoneNumber.replace(/[^\d+]/g, '')
    window.open(`https://wa.me/${cleaned.replace(/^\+/, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    return
  }

  await navigator.clipboard.writeText(text)
  window.alert('Reminder copied. Paste it into SMS or WhatsApp.')
}

const DebtorSuccessSheet = ({
  successState,
  onClose,
}: {
  successState: DebtorSuccessState
  onClose: () => void
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-5 py-10 sm:px-8 sm:py-12 flex flex-col items-center gap-5 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full flex items-center justify-center" style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #c04818, #e8a838)', boxShadow: '0 0 0 12px rgba(196,98,45,0.12), 0 0 0 24px rgba(196,98,45,0.06)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>

        {successState.kind === 'created' ? (
          <>
            <div className="text-center">
              <h2 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>
                Debtor added!
              </h2>
              <p className="font-body text-sm mt-1.5" style={{ color: 'rgba(245,237,224,0.4)' }}>
                {successState.queued
                  ? `${successState.customerName} was saved locally and will sync when you are online.`
                  : `${successState.customerName} is now on your debtors list.`}
              </p>
            </div>
            <div className="w-full rounded-xl px-5 py-4 flex items-center justify-between" style={{ background: '#2e1c14', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.6)' }}>Amount owed</span>
              <span className="font-display font-bold" style={{ fontSize: '1.1rem', color: '#f87171', fontVariationSettings: "'WONK' 1" }}>{fmt(successState.totalOwed)}</span>
            </div>
            {successState.dueDate ? (
              <div className="w-full rounded-xl px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(232,168,56,0.08)', border: '1px solid rgba(232,168,56,0.2)' }}>
                <span className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.58)' }}>Due date</span>
                <span className="font-ui font-bold text-sm" style={{ color: '#f0bc5a' }}>
                  {new Date(successState.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>
                {successState.cleared ? 'Debt cleared!' : 'Payment recorded!'}
              </h2>
              <p className="font-body text-sm mt-1.5" style={{ color: 'rgba(245,237,224,0.4)' }}>
                {successState.cleared ? `${successState.customerName} has fully paid.` : `${successState.customerName}'s balance has been updated.`}
              </p>
            </div>
            <div className="w-full rounded-xl px-5 py-4 flex items-center justify-between" style={{ background: '#2e1c14', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.6)' }}>Amount paid</span>
              <span className="font-display font-bold" style={{ fontSize: '1.1rem', color: '#4ecca3', fontVariationSettings: "'WONK' 1" }}>{fmt(successState.paymentAmount)}</span>
            </div>
            {!successState.cleared ? (
              <div className="w-full rounded-xl px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <span className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.58)' }}>Remaining balance</span>
                <span className="font-display font-bold" style={{ fontSize: '1.05rem', color: '#f87171', fontVariationSettings: "'WONK' 1" }}>{fmt(successState.remainingBalance)}</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

const AddDebtorSheet = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: (state: DebtorSuccessState) => void }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const createDebtor = useCreateDebtor()

  const handleSubmit = async () => {
    const totalOwed = parseNairaInput(amount)
    if (!name.trim() || !Number.isFinite(totalOwed) || totalOwed <= 0) return

    const createdDebtor = await createDebtor.mutateAsync({
      customerName: name.trim(),
      phoneNumber: phone || undefined,
      totalOwed,
      dueDate: dueDate || undefined,
    } as any)
    const queued =
      'syncStatus' in createdDebtor &&
      (createdDebtor.syncStatus === 'PENDING' || createdDebtor.syncStatus === 'FAILED')

    onClose()
    onSuccess({
      kind: 'created',
      customerName: createdDebtor.customerName ?? name.trim(),
      totalOwed,
      dueDate: createdDebtor.dueDate ?? (dueDate || undefined),
      queued,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 flex flex-col gap-5 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Add debtor</h2>

        {[
          { label: 'Customer name', value: name, set: setName, placeholder: 'Chukwu Emeka', type: 'text' },
          { label: 'Phone number (optional)', value: phone, set: setPhone, placeholder: '0801 234 5678', type: 'tel' },
          { label: 'Amount owed (N)', value: amount, set: setAmount, placeholder: '5000', type: 'number' },
          { label: 'Due date (optional)', value: dueDate, set: setDueDate, placeholder: '', type: 'date' },
        ].map((field) => (
          <div key={field.label} className="flex flex-col gap-2">
            <label className="label-base">{field.label}</label>
            <input type={field.type} placeholder={field.placeholder} value={field.value} onChange={(e) => field.set(e.target.value)} className="input-base" />
          </div>
        ))}

        <button
          onClick={() => void handleSubmit()}
          disabled={!name.trim() || !amount || !Number.isFinite(parseNairaInput(amount)) || parseNairaInput(amount) <= 0 || createDebtor.isPending}
          className="btn-primary mt-2"
        >
          {createDebtor.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Add debtor'}
        </button>
      </div>
    </div>
  )
}

const PaymentSheet = ({
  debtor,
  onClose,
  onSuccess,
}: {
  debtor: DebtorLike
  onClose: () => void
  onSuccess: (state: DebtorSuccessState) => void
}) => {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const recordPayment = useRecordPayment(debtor.id)
  const updateSchedule = useUpdateDebtorSchedule(debtor.id)

  const handleSubmit = async () => {
    const paymentAmount = parseNairaInput(amount)
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return
    setErrorMessage(null)

    try {
      await recordPayment.mutateAsync({
        amount: paymentAmount,
        paidAt: new Date().toISOString(),
        note: note || undefined,
      })

      if (nextDueDate) {
        try {
          await updateSchedule.mutateAsync(`${nextDueDate}T00:00:00.000Z`)
        } catch (scheduleError) {
          // Do not fail payment success because schedule update can require network.
          console.warn('Debtor schedule update skipped after payment', {
            debtorId: debtor.id,
            nextDueDate,
            scheduleError,
          })
        }
      }

      const isCleared = debtor.balance - paymentAmount <= 0.01
      onClose()
      onSuccess({
        kind: 'payment',
        customerName: debtor.customerName,
        cleared: isCleared,
        paymentAmount,
        remainingBalance: Math.max(debtor.balance - paymentAmount, 0),
      })
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message

      const fallback = 'Payment could not be recorded. Please try again.'
      const finalMessage = typeof apiMessage === 'string' && apiMessage.trim() ? apiMessage : fallback
      setErrorMessage(finalMessage)

      console.error('Debtor payment failed', {
        debtorId: debtor.id,
        amount: paymentAmount,
        note,
        nextDueDate,
        error,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 flex flex-col gap-5 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Record payment</h2>
          <p className="font-body text-sm mt-1" style={{ color: 'rgba(245,237,224,0.4)' }}>
            {debtor.customerName} owes <span style={{ color: '#f87171' }}>{fmt(debtor.balance)}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="label-base">Payment amount (N)</label>
          <input type="text" inputMode="decimal" placeholder="e.g. 65000 or 65k" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base" style={{ fontFamily: "'Fraunces', serif", fontSize: '1.25rem', fontVariationSettings: "'WONK' 1" }} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="label-base">Note (optional)</label>
          <input type="text" placeholder="e.g. Part payment..." value={note} onChange={(e) => setNote(e.target.value)} className="input-base" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="label-base">Next payment date (optional)</label>
          <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className="input-base" />
          <p className="font-body text-xs" style={{ color: 'rgba(245,237,224,0.35)' }}>
            Tip: set this for installment 1, 2, or 3. You can update again later.
          </p>
        </div>
        {errorMessage ? (
          <div
            className="rounded-xl px-3 py-2 text-xs font-body"
            style={{
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.22)',
              color: '#fca5a5',
            }}
          >
            {errorMessage}
          </div>
        ) : null}
        <button
          onClick={() => void handleSubmit()}
          disabled={!amount || !Number.isFinite(parseNairaInput(amount)) || parseNairaInput(amount) <= 0 || recordPayment.isPending || updateSchedule.isPending}
          className="btn-primary"
        >
          {recordPayment.isPending || updateSchedule.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Record payment'}
        </button>
      </div>
    </div>
  )
}

const ScheduleSheet = ({ debtor, onClose }: { debtor: DebtorLike; onClose: () => void }) => {
  const [dueDate, setDueDate] = useState(toDateInputValue(debtor.dueDate))
  const updateSchedule = useUpdateDebtorSchedule(debtor.id)

  const setQuickDate = (daysFromNow: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    setDueDate(toDateInputValue(d.toISOString()))
  }

  const handleSave = async () => {
    await updateSchedule.mutateAsync(dueDate ? `${dueDate}T00:00:00.000Z` : null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 flex flex-col gap-5 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Payment schedule</h2>
          <p className="font-body text-sm mt-1" style={{ color: 'rgba(245,237,224,0.4)' }}>{debtor.customerName}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Today', days: 0 },
            { label: '+3 days', days: 3 },
            { label: '+7 days', days: 7 },
            { label: '+14 days', days: 14 },
          ].map((quick) => (
            <button
              key={quick.label}
              type="button"
              className="rounded-xl px-2 py-2 text-[11px] font-ui font-bold"
              style={{ background: 'rgba(232,168,56,0.12)', border: '1px solid rgba(232,168,56,0.22)', color: '#f0bc5a' }}
              onClick={() => setQuickDate(quick.days)}
            >
              {quick.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Next payment date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-base" />
          <p className="font-body text-xs" style={{ color: 'rgba(245,237,224,0.35)' }}>
            You can use this for 1st, 2nd, or 3rd installment reminders.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button className="btn-ghost" onClick={() => void updateSchedule.mutateAsync(null).then(onClose)} disabled={updateSchedule.isPending}>Clear date</button>
          <button className="btn-primary" onClick={() => void handleSave()} disabled={updateSchedule.isPending || !dueDate}>
            {updateSchedule.isPending ? 'Saving...' : 'Save schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

const StatementSheet = ({ debtor, onClose }: { debtor: DebtorLike; onClose: () => void }) => {
  const { data, isLoading } = useDebtorStatement(debtor.id)

  const handleCopy = async () => {
    if (!data) return
    await navigator.clipboard.writeText(buildDebtorStatementText(data))
    window.alert('Statement copied.')
  }

  const handleShare = async () => {
    if (!data) return
    await shareDebtorStatement(data)
  }

  const handlePrint = () => {
    if (!data) return
    printDebtorStatement(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-2xl mx-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 flex flex-col gap-4 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display font-bold" style={{ fontSize: '1.45rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Debtor statement</h2>
            <p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.45)' }}>{debtor.customerName}</p>
          </div>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <div className="h-16 rounded-xl skeleton" />
            <div className="h-16 rounded-xl skeleton" />
            <div className="h-16 rounded-xl skeleton" />
          </div>
        ) : !data ? (
          <p className="font-body text-sm text-secondary">No statement data available.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-xl px-3 py-3" style={{ background: '#2a1912', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="label-base mb-1">Credit sales</p>
                <p className="font-display font-bold" style={{ color: '#f5ede0' }}>{fmt(data.totals.totalSalesOnCredit)}</p>
              </div>
              <div className="rounded-xl px-3 py-3" style={{ background: '#2a1912', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="label-base mb-1">Payments</p>
                <p className="font-display font-bold" style={{ color: '#4ecca3' }}>{fmt(data.totals.totalPayments)}</p>
              </div>
              <div className="rounded-xl px-3 py-3" style={{ background: '#2a1912', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="label-base mb-1">Balance</p>
                <p className="font-display font-bold" style={{ color: '#f87171' }}>{fmt(data.totals.balance)}</p>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#231510' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-ui font-bold text-sm" style={{ color: '#f5ede0' }}>Timeline</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {data.entries.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-secondary">No statement entries yet.</div>
                ) : data.entries.map((entry) => (
                  <div key={`${entry.type}-${entry.id}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-ui font-bold text-xs uppercase tracking-[0.08em]" style={{ color: entry.type === 'SALE' ? '#f0bc5a' : '#4ecca3' }}>
                          {entry.type === 'SALE' ? 'Credit sale' : 'Payment'}
                        </p>
                        <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.45)' }}>{formatDateTime(entry.date)}</p>
                        {entry.reference ? <p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.62)' }}>{entry.reference}</p> : null}
                        {entry.note ? <p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.4)' }}>{entry.note}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold" style={{ color: entry.type === 'SALE' ? '#f0bc5a' : '#4ecca3' }}>{fmt(entry.amount)}</p>
                        <p className="font-body text-[11px] mt-0.5" style={{ color: 'rgba(245,237,224,0.4)' }}>Balance {fmt(entry.balanceAfter)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button className="btn-ghost" onClick={handlePrint}>Print / PDF</button>
              <button className="btn-ghost" onClick={() => void handleShare()}>Share</button>
              <button className="btn-ghost" onClick={() => data && void downloadDebtorStatement(data)}>Download</button>
              <button className="btn-ghost" onClick={() => void handleCopy()}>Copy Text</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const DebtorsPage = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorLike | null>(null)
  const [statementDebtor, setStatementDebtor] = useState<DebtorLike | null>(null)
  const [scheduleDebtor, setScheduleDebtor] = useState<DebtorLike | null>(null)
  const [successState, setSuccessState] = useState<DebtorSuccessState | null>(null)
  const [activeTab, setActiveTab] = useState<DebtorTab>('OWING')
  const retryDebtorSync = useRetryDebtorSync()
  const { data, isLoading } = useDebtorsList()
  const debtors = data?.pages.flatMap((page) => page.data) ?? []
  const overdueDebtors = debtors.filter((debtor: any) => isOverdueDebtor(debtor))
  const dueSoonDebtors = debtors.filter((debtor: any) => isDueSoonDebtor(debtor))

  const filteredDebtors = debtors.filter((debtor: any) => {
    if (activeTab === 'ALL') return true
    if (activeTab === 'CLEARED') return debtor.balance === 0 || debtor.status === 'CLEARED'
    return debtor.balance > 0
  })

  const tabCounts = {
    OWING: debtors.filter((debtor: any) => debtor.balance > 0).length,
    CLEARED: debtors.filter((debtor: any) => debtor.balance === 0 || debtor.status === 'CLEARED').length,
    ALL: debtors.length,
  }

  useEffect(() => {
    if (!successState) return
    const timer = window.setTimeout(() => setSuccessState(null), 2600)
    return () => window.clearTimeout(timer)
  }, [successState])

  return (
    <div className="min-h-screen">
      <div className="px-4 pb-5 pt-8 max-[360px]:px-3.5 max-[360px]:pt-7 sm:px-5 sm:pt-10 sm:pb-6">
        <div className="mx-auto max-w-6xl">
          <MarketSceneBanner
            image="/market-scenes/dashboard-market-2.jpg"
            eyebrow="Manage"
            title="Debtors"
            description="Follow up balances, watch overdue payments, and keep customer credit from quietly draining cash."
            badge="Collections"
          >
            <button onClick={() => setAddOpen(true)} className="rounded-xl px-3.5 py-2.5 text-[13px] font-ui font-bold max-[360px]:px-3 max-[360px]:py-2 max-[360px]:text-xs" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ Add</button>
          </MarketSceneBanner>
        </div>
      </div>

      <div className="px-4 max-w-6xl mx-auto flex flex-col gap-3 max-[360px]:px-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="label-base mb-1">Overdue debtors</p>
            <p className="font-display font-bold text-2xl" style={{ color: '#f87171', fontVariationSettings: "'WONK' 1" }}>{overdueDebtors.length}</p>
            <p className="mt-1 text-xs text-secondary">Need urgent follow-up.</p>
          </div>
          <div className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="label-base mb-1">Due in 3 days</p>
            <p className="font-display font-bold text-2xl" style={{ color: '#f0bc5a', fontVariationSettings: "'WONK' 1" }}>{dueSoonDebtors.length}</p>
            <p className="mt-1 text-xs text-secondary">Good time to remind them early.</p>
          </div>
          <div className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="label-base mb-1">Total receivables</p>
            <p className="font-display font-bold text-2xl" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{fmt(debtors.reduce((sum: number, debtor: any) => sum + Math.max(debtor.balance, 0), 0))}</p>
            <p className="mt-1 text-xs text-secondary">What customers still owe you.</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 max-[360px]:gap-1.5" style={{ scrollbarWidth: 'none' }}>
          {([
            ['OWING', 'Owing'],
            ['CLEARED', 'Cleared'],
            ['ALL', 'All'],
          ] as [DebtorTab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="rounded-full px-4 py-2 font-ui font-bold text-xs flex-shrink-0 transition-all duration-150 max-[360px]:px-3 max-[360px]:py-1.5" style={{ background: activeTab === tab ? 'linear-gradient(135deg, #c04818, #e8a838)' : 'rgba(255,255,255,0.05)', color: activeTab === tab ? '#fff' : 'rgba(245,237,224,0.5)', border: `1px solid ${activeTab === tab ? 'transparent' : 'rgba(255,255,255,0.07)'}`, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {label} ({tabCounts[tab]})
            </button>
          ))}
        </div>

        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl skeleton" />)
        ) : filteredDebtors.length === 0 ? (
          <div className="relative overflow-hidden rounded-[26px] border border-white/10 px-5 py-12 text-center" style={{ background: '#231510' }}>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(20,13,10,0.62) 0%, rgba(20,13,10,0.86) 100%), url('/market-scenes/dashboard-market-2.jpg')",
              }}
            />
            <div className="pointer-events-none absolute inset-0 pattern-dots opacity-25" />
            <div className="relative flex flex-col items-center gap-3">
              <span className="text-[#f0bc5a]">
                <EmptyPeopleIcon />
              </span>
              <p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{activeTab === 'OWING' ? 'Nobody owes you right now' : activeTab === 'CLEARED' ? 'No cleared debtors yet' : 'No debtors'}</p>
              <p className="max-w-sm font-body text-sm" style={{ color: 'rgba(245,237,224,0.42)' }}>
                {activeTab === 'OWING'
                  ? 'Everyone has paid. That means collections are under control for now.'
                  : activeTab === 'CLEARED'
                    ? 'Cleared records stay here for history and follow-up confidence.'
                    : 'Add your first debtor so TradeBook can track balances, due dates, and reminders.'}
              </p>
              {activeTab === 'ALL' ? (
                <button onClick={() => setAddOpen(true)} className="mt-2 rounded-xl px-4 py-2.5 font-ui font-bold text-sm" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>
                  Add first debtor
                </button>
              ) : null}
            </div>
          </div>
        ) : filteredDebtors.map((debtor: any) => (
          <div key={debtor.id} className="rounded-2xl px-4 py-4 sm:px-5 flex flex-col gap-3 sm:gap-4 max-[360px]:px-3.5 max-[360px]:py-3.5 max-[360px]:gap-2.5" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-full flex items-center justify-center font-ui font-bold text-sm flex-shrink-0 max-[360px]:text-xs" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, rgba(192,72,24,0.35), rgba(45,58,124,0.35))', color: '#f0bc5a', border: '1px solid rgba(232,168,56,0.2)' }}>{debtor.customerName[0].toUpperCase()}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-ui font-semibold text-sm leading-tight break-words max-[360px]:text-[13px]" style={{ color: '#f5ede0' }}>{debtor.customerName}</p>
                    {debtor.balance === 0 && <span className="inline-flex rounded-full px-2.5 py-1 font-ui font-bold text-[10px] max-[360px]:px-2 max-[360px]:py-0.5 max-[360px]:text-[9px]" style={{ background: 'rgba(78,204,163,0.12)', color: '#4ecca3', border: '1px solid rgba(78,204,163,0.2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cleared</span>}
                  </div>
                  {debtor.phoneNumber && <p className="font-body text-xs mt-0.5 break-all max-[360px]:text-[11px]" style={{ color: 'rgba(245,237,224,0.3)' }}>{debtor.phoneNumber}</p>}
                  {debtor.dueDate && <p className="font-body text-xs mt-1 max-[360px]:text-[11px]" style={{ color: isOverdueDebtor(debtor) ? '#f87171' : isDueSoonDebtor(debtor) ? '#f0bc5a' : '#f0bc5a' }}>{isOverdueDebtor(debtor) ? 'Overdue since ' : 'Due '}{new Date(debtor.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-right">
                <p className="font-display font-bold leading-none max-[360px]:text-[0.95rem]" style={{ fontSize: '1.05rem', color: debtor.balance === 0 ? '#4ecca3' : '#f87171', fontVariationSettings: "'WONK' 1" }}>{fmt(debtor.balance)}</p>
                <RecordSyncBadge syncStatus={debtor.syncStatus} onRetry={debtor.syncStatus === 'FAILED' ? () => retryDebtorSync.mutate() : undefined} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <button onClick={() => setScheduleDebtor(debtor)} className="rounded-full px-3 py-2 font-ui font-bold text-xs w-full sm:w-auto max-[360px]:px-2.5 max-[360px]:py-1.5 max-[360px]:text-[11px]" style={{ background: 'rgba(117,133,200,0.18)', color: '#9fb0ff', border: '1px solid rgba(117,133,200,0.28)' }}>Schedule</button>
              <button onClick={() => setStatementDebtor(debtor)} className="rounded-full px-3 py-2 font-ui font-bold text-xs w-full sm:w-auto max-[360px]:px-2.5 max-[360px]:py-1.5 max-[360px]:text-[11px]" style={{ background: 'rgba(232,168,56,0.15)', color: '#f0bc5a', border: '1px solid rgba(232,168,56,0.22)' }}>Statement</button>
              {debtor.balance > 0 && <button onClick={() => void sendReminder(debtor)} className="rounded-full px-3 py-2 font-ui font-bold text-xs w-full sm:w-auto max-[360px]:px-2.5 max-[360px]:py-1.5 max-[360px]:text-[11px]" style={{ background: 'rgba(159,176,255,0.14)', color: '#9fb0ff', border: '1px solid rgba(159,176,255,0.22)' }}>Remind</button>}
              {debtor.balance > 0 && <button onClick={() => setSelectedDebtor(debtor)} className="rounded-full px-3 py-2 font-ui font-bold text-xs w-full col-span-2 sm:col-span-1 sm:w-auto max-[360px]:px-2.5 max-[360px]:py-1.5 max-[360px]:text-[11px]" style={{ background: 'rgba(78,204,163,0.12)', color: '#4ecca3', border: '1px solid rgba(78,204,163,0.2)' }}>Pay</button>}
            </div>
          </div>
        ))}
      </div>

      {addOpen && <AddDebtorSheet onClose={() => setAddOpen(false)} onSuccess={setSuccessState} />}
      {selectedDebtor && (
        <PaymentSheet
          debtor={selectedDebtor}
          onClose={() => setSelectedDebtor(null)}
          onSuccess={setSuccessState}
        />
      )}
      {statementDebtor && <StatementSheet debtor={statementDebtor} onClose={() => setStatementDebtor(null)} />}
      {scheduleDebtor && <ScheduleSheet debtor={scheduleDebtor} onClose={() => setScheduleDebtor(null)} />}
      {successState && <DebtorSuccessSheet successState={successState} onClose={() => setSuccessState(null)} />}
    </div>
  )
}
