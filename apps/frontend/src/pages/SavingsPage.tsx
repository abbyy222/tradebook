import { useEffect, useMemo, useState } from 'react'
import { MarketSceneBanner } from '@/components/MarketSceneBanner'
import { useAuthStore } from '@/stores/authStore'
import {
  useConfirmSavingsVerification,
  useCreateSavingsEntry,
  useInitiateSavingsVerification,
  useSavingsAccount,
  useSavingsBanks,
  useSavingsEntries,
  useSavingsTargetProgress,
  useSavingsTodaySummary,
  useResolveSavingsAccount,
  useSavingsVerificationPreview,
  useUpdateSavingsAccount,
  useUpdateSavingsTarget,
} from '@/hooks/useSavings'
import type {
  SavingsVerificationConfirmationDTO,
  SavingsTargetPeriod,
  SavingsVerificationPreviewDTO,
  SavingsVerificationStatus,
} from '@tradebook/shared-types'

const fmt = (n: number) => 'NGN ' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const toDateValue = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const statusLabel: Record<SavingsVerificationStatus, string> = {
  DECLARED: 'Declared',
  RECONCILED: 'Reconciled',
  VERIFIED: 'Verified',
}

const statusClasses: Record<SavingsVerificationStatus, string> = {
  DECLARED: 'border-white/10 bg-[#2b1912] text-secondary',
  RECONCILED: 'border-[#e8a838]/30 bg-[#3a2319] text-[#f0bc5a]',
  VERIFIED: 'border-[#4ecca3]/30 bg-[rgba(78,204,163,0.14)] text-[#4ecca3]',
}

const payoutStatusTone = (status?: string | null) => {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
      return 'border-[#4ecca3]/30 bg-[rgba(78,204,163,0.14)] text-[#4ecca3]'
    case 'FAILED':
    case 'REVERSED':
      return 'border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]'
    case 'PENDING':
    case 'PROCESSING':
      return 'border-[#e8a838]/30 bg-[#3a2319] text-[#f0bc5a]'
    default:
      return 'border-white/10 bg-[#2b1912] text-secondary'
  }
}

export const SavingsPage = () => {
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'

  const [amount, setAmount] = useState('')
  const [savedDate, setSavedDate] = useState(() => toDateValue(new Date()))
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')
  const [targetPeriod, setTargetPeriod] = useState<SavingsTargetPeriod>('MONTHLY')
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [bankName, setBankName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState('')
  const [verifyPreview, setVerifyPreview] = useState<SavingsVerificationPreviewDTO | null>(null)
  const [verificationResult, setVerificationResult] = useState<SavingsVerificationConfirmationDTO | null>(null)

  const createSavings = useCreateSavingsEntry()
  const updateTarget = useUpdateSavingsTarget()
  const updateAccount = useUpdateSavingsAccount()
  const resolveAccount = useResolveSavingsAccount()
  const verificationPreview = useSavingsVerificationPreview()
  const initiateVerification = useInitiateSavingsVerification()
  const confirmVerification = useConfirmSavingsVerification()
  const { data: listData, isLoading } = useSavingsEntries()
  const { data: todaySummary } = useSavingsTodaySummary()
  const { data: targetProgress } = useSavingsTargetProgress()
  const { data: savingsAccount, isLoading: accountLoading } = useSavingsAccount()
  const { data: banks = [], isLoading: banksLoading } = useSavingsBanks()

  const entries = listData?.pages.flatMap((p) => p.data) ?? []

  useEffect(() => {
    if (!isOwner || accountLoading) return
    setAccountModalOpen(!savingsAccount)
  }, [accountLoading, isOwner, savingsAccount])

  useEffect(() => {
    if (!savingsAccount) return
    setBankName(savingsAccount.bankName)
    setBankCode(savingsAccount.bankCode)
    setAccountNumber(savingsAccount.accountNumber)
    setAccountName(savingsAccount.accountName)
  }, [savingsAccount])

  const thisWeekTotal = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    const day = start.getDay()
    const offset = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - offset)
    start.setHours(0, 0, 0, 0)

    return entries
      .filter((entry) => new Date(entry.savedAt).getTime() >= start.getTime())
      .reduce((sum, entry) => sum + entry.amount, 0)
  }, [entries])

  const thisMonthTotal = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)

    return entries
      .filter((entry) => new Date(entry.savedAt).getTime() >= start.getTime())
      .reduce((sum, entry) => sum + entry.amount, 0)
  }, [entries])

  const handleSubmit = async () => {
    await createSavings.mutateAsync({
      amount: parseFloat(amount),
      savedAt: new Date(`${savedDate}T12:00:00.000Z`).toISOString(),
      note: note.trim() || undefined,
    })

    setAmount('')
    setNote('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 1600)
  }

  const handleTargetSubmit = async () => {
    await updateTarget.mutateAsync({
      amount: parseFloat(targetAmount),
      period: targetPeriod,
    })

    setTargetAmount('')
  }

  const handleAccountSubmit = async () => {
    await updateAccount.mutateAsync({
      bankName: bankName.trim(),
      bankCode: bankCode.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    })

    setAccountModalOpen(false)
  }

  const openVerifyModal = async (entryId: string) => {
    setSelectedEntryId(entryId)
    setVerifyError('')
    setVerifyPreview(null)
    setVerificationResult(null)
    setVerifyModalOpen(true)

    try {
      const preview = await verificationPreview.mutateAsync(entryId)
      setVerifyPreview(preview)
    } catch (error: any) {
      const message = error?.response?.data?.error?.message ?? 'Could not prepare verification preview right now.'
      setVerifyError(message)
    }
  }

  const handleResolveAccount = async () => {
    const resolved = await resolveAccount.mutateAsync({
      bankCode: bankCode.trim(),
      accountNumber: accountNumber.trim(),
    })

    setAccountName(resolved.accountName)
  }

  const handleStartVerification = async () => {
    if (!selectedEntryId) return

    try {
      const result = await initiateVerification.mutateAsync(selectedEntryId)
      setVerifyPreview((current) => current ? { ...current, activeAttempt: result.attempt, entry: result.entry, message: result.message } : null)
      setVerifyError('')
      setVerificationResult(null)
    } catch (error: any) {
      const message = error?.response?.data?.error?.message ?? 'Could not generate transfer instructions right now.'
      setVerifyError(message)
    }
  }

  const handleRefreshVerification = async () => {
    if (!selectedEntryId) return
    const reference = verifyPreview?.activeAttempt?.reference
    if (!reference) return

    try {
      const result = await confirmVerification.mutateAsync({
        id: selectedEntryId,
        input: { reference },
      })
      setVerificationResult(result)
      setVerifyError('')
      const refreshedPreview = await verificationPreview.mutateAsync(selectedEntryId)
      setVerifyPreview(refreshedPreview)
    } catch (error: any) {
      const message = error?.response?.data?.error?.message ?? 'We could not refresh this payment yet.'
      setVerifyError(message)
    }
  }

  return (
    <div className="min-h-screen px-4 pb-8 pt-10 sm:px-5 sm:pt-12 md:px-6 xl:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <MarketSceneBanner
          image="/market-scenes/dashboard-market-3.jpg"
          eyebrow="Daily saving"
          title="Savings"
          description={
            isOwner
              ? 'Track daily savings with the discipline of a full trading day close.'
              : 'Record today\'s savings. Owner can edit records later.'
          }
          badge="Day close"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-3">
            <p className="label-base mb-1">Today</p>
            <p className="font-display text-2xl font-bold text-[#4ecca3] wonky">{fmt(todaySummary?.total ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-3">
            <p className="label-base mb-1">This week</p>
            <p className="font-display text-2xl font-bold text-primary wonky">{fmt(thisWeekTotal)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-3">
            <p className="label-base mb-1">This month</p>
            <p className="font-display text-2xl font-bold text-primary wonky">{fmt(thisMonthTotal)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-ui text-sm font-bold text-primary">Savings account for verification</p>
              <p className="mt-1 text-xs text-secondary">
                Verified savings will move money to this account once the payment interface is connected.
              </p>
            </div>
            {isOwner ? (
              <button className="btn-secondary px-4 py-2 text-sm" onClick={() => setAccountModalOpen(true)}>
                {savingsAccount ? 'Update account' : 'Set up account'}
              </button>
            ) : null}
          </div>

          {savingsAccount ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#1f130e] px-4 py-3">
                <p className="label-base mb-1">Bank</p>
                <p className="font-ui text-sm font-bold text-primary">{savingsAccount.bankName}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1f130e] px-4 py-3">
                <p className="label-base mb-1">Account number</p>
                <p className="font-ui text-sm font-bold text-primary">{savingsAccount.accountNumber}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1f130e] px-4 py-3">
                <p className="label-base mb-1">Account name</p>
                <p className="font-ui text-sm font-bold text-primary">{savingsAccount.accountName}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[#e8a838]/30 bg-[#1f130e] p-4 text-sm text-secondary">
              {isOwner
                ? 'Set a savings account so TradeBook can later pay verified savings into your chosen destination.'
                : 'The business owner has not set the savings account yet.'}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-ui text-sm font-bold text-primary">Savings target</p>
              <p className="mt-1 text-xs text-secondary">
                Set a target and track how close this business is to hitting it. Entries below will now be tagged as declared, reconciled, or verified.
              </p>
            </div>
            {targetProgress?.target ? (
              <span className="rounded-full border border-[#e8a838]/25 bg-[#2d1b14] px-3 py-1 text-[11px] font-ui font-bold uppercase tracking-[0.08em] text-[#f0bc5a]">
                {targetProgress.target.period.toLowerCase()}
              </span>
            ) : null}
          </div>

          {targetProgress?.target ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#1f130e] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="label-base mb-1">{targetProgress.period?.label ?? 'Target period'}</p>
                  <p className="font-display text-2xl font-bold text-[#f0bc5a] wonky">
                    {fmt(targetProgress.target.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="label-base mb-1">Saved so far</p>
                  <p className="font-display text-xl font-bold text-[#4ecca3] wonky">
                    {fmt(targetProgress.currentSaved)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-3 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#c04818] to-[#e8a838] transition-all duration-300"
                    style={{ width: `${Math.max(targetProgress.progressPercent, 4)}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-secondary">
                    {targetProgress.progressPercent}% complete
                    {targetProgress.period ? ` • ${new Date(targetProgress.period.from).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} - ${new Date(targetProgress.period.to).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                  <span className={targetProgress.isCompleted ? 'text-[#4ecca3]' : 'text-secondary'}>
                    {targetProgress.isCompleted ? 'Target completed' : `${fmt(targetProgress.remaining)} left`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[#1f130e] p-4 text-sm text-secondary">
              No target set yet.
            </div>
          )}

          {isOwner ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_180px_auto]">
              <input
                type="number"
                inputMode="decimal"
                placeholder={targetProgress?.target ? `Update amount (${fmt(targetProgress.target.amount)})` : 'Target amount'}
                className="input-base"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
              <select
                className="input-base"
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value as SavingsTargetPeriod)}
              >
                <option value="DAILY">Daily target</option>
                <option value="WEEKLY">Weekly target</option>
                <option value="MONTHLY">Monthly target</option>
              </select>
              <button
                className="btn-primary"
                disabled={!targetAmount || parseFloat(targetAmount) <= 0 || updateTarget.isPending}
                onClick={() => void handleTargetSubmit()}
              >
                {updateTarget.isPending ? 'Saving...' : targetProgress?.target ? 'Update target' : 'Set target'}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-secondary">Only the business owner can update savings targets.</p>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <p className="font-ui text-sm font-bold text-primary">Record savings</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount"
              className="input-base"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="date"
              className="input-base"
              value={savedDate}
              onChange={(e) => setSavedDate(e.target.value)}
              disabled={!isOwner}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              className="input-base"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button
              className="btn-primary"
              disabled={!amount || parseFloat(amount) <= 0 || createSavings.isPending}
              onClick={() => void handleSubmit()}
            >
              {createSavings.isPending ? 'Saving...' : 'Save now'}
            </button>
            {success ? <p className="text-sm font-semibold text-[#4ecca3]">Saved successfully.</p> : null}
          </div>
          {!isOwner ? (
            <p className="mt-2 text-xs text-secondary">Salesperson can only save for today.</p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#231510]">
          <div className="border-b border-white/10 px-4 py-3.5">
            <p className="font-ui text-sm font-bold text-primary">Recent savings records</p>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              <div className="h-14 rounded-xl skeleton" />
              <div className="h-14 rounded-xl skeleton" />
            </div>
          ) : entries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-secondary">No savings records yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {entries.slice(0, 20).map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-ui text-sm font-semibold text-primary">
                        {new Date(entry.savedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-ui font-bold uppercase tracking-[0.08em] ${statusClasses[entry.status]}`}>
                        {statusLabel[entry.status]}
                      </span>
                    </div>
                    <p className="text-xs text-secondary sm:truncate">{entry.note || 'No note'}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <p className="font-display text-lg font-bold text-[#4ecca3] wonky">{fmt(entry.amount)}</p>
                    {isOwner && entry.status !== 'VERIFIED' ? (
                      <button
                        type="button"
                        className="rounded-full border border-[#e8a838]/30 bg-[#3a2319] px-3 py-1.5 text-[11px] font-ui font-bold uppercase tracking-[0.08em] text-[#f0bc5a]"
                        onClick={() => void openVerifyModal(entry.id)}
                      >
                        Verify
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {accountModalOpen && isOwner ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#20130e] p-4 shadow-2xl sm:p-5">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="label-base mb-1">Savings setup</p>
                <h2 className="font-display text-2xl font-bold text-primary wonky">Set your savings account</h2>
              </div>
              {savingsAccount ? (
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-secondary"
                >
                  Close
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-sm leading-6 text-secondary">
              TradeBook needs the bank details where your verified savings should go. This helps us distinguish manual records from savings that were actually transferred.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <select
                className="input-base"
                value={bankCode}
                onChange={(e) => {
                  const nextBankCode = e.target.value
                  setBankCode(nextBankCode)
                  const selectedBank = banks.find((bank) => bank.code === nextBankCode)
                  setBankName(selectedBank?.name ?? '')
                  setAccountName('')
                }}
                disabled={banksLoading}
              >
                <option value="">{banksLoading ? 'Loading banks...' : 'Select bank'}</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Account number"
                className="input-base"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 20))
                  setAccountName('')
                }}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Resolved account name"
                  className="input-base flex-1"
                  value={accountName}
                  readOnly
                />
                <button
                  type="button"
                  className="btn-secondary whitespace-nowrap"
                  disabled={!bankCode || accountNumber.length < 10 || resolveAccount.isPending}
                  onClick={() => void handleResolveAccount()}
                >
                  {resolveAccount.isPending ? 'Resolving...' : 'Resolve account'}
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {savingsAccount ? (
                <button type="button" className="btn-secondary" onClick={() => setAccountModalOpen(false)}>
                  Not now
                </button>
              ) : null}
              <button
                type="button"
                className="btn-primary"
                disabled={
                  bankName.trim().length < 2 ||
                  bankCode.trim().length < 2 ||
                  accountNumber.trim().length < 10 ||
                  accountName.trim().length < 2 ||
                  updateAccount.isPending
                }
                onClick={() => void handleAccountSubmit()}
              >
                {updateAccount.isPending ? 'Saving...' : 'Save savings account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {verifyModalOpen && isOwner ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#20130e] p-4 shadow-2xl sm:p-5">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="label-base mb-1">Verification review</p>
                <h2 className="font-display text-2xl font-bold text-primary wonky">Prepare savings verification</h2>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-secondary"
              >
                Close
              </button>
            </div>

            {verificationPreview.isPending && selectedEntryId ? (
              <div className="mt-5 space-y-2">
                <div className="h-14 rounded-xl skeleton" />
                <div className="h-14 rounded-xl skeleton" />
              </div>
            ) : verifyError ? (
              <div className="mt-5 rounded-2xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.08)] p-4 text-sm text-[#fca5a5]">
                {verifyError}
              </div>
            ) : verifyPreview ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#1f130e] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div>
                      <p className="label-base mb-1">Savings entry</p>
                      <p className="font-display text-2xl font-bold text-[#4ecca3] wonky">{fmt(verifyPreview.entry.amount)}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-ui font-bold uppercase tracking-[0.08em] ${statusClasses[verifyPreview.entry.status]}`}>
                      {statusLabel[verifyPreview.entry.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-secondary">
                    {new Date(verifyPreview.entry.savedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#1f130e] p-4">
                  <p className="label-base mb-2">Payout destination</p>
                  {verifyPreview.payoutDestination ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-secondary">Bank</p>
                        <p className="mt-1 font-ui text-sm font-bold text-primary">{verifyPreview.payoutDestination.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Account number</p>
                        <p className="mt-1 font-ui text-sm font-bold text-primary">{verifyPreview.payoutDestination.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Account name</p>
                        <p className="mt-1 font-ui text-sm font-bold text-primary">{verifyPreview.payoutDestination.accountName}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-secondary">
                      No payout destination has been saved yet. You can still verify inbound payment first and set the payout account later.
                    </p>
                  )}
                </div>

                {verifyPreview.activeAttempt ? (
                  <div className="rounded-2xl border border-[#e8a838]/25 bg-[#2d1b14] p-4">
                    <p className="font-ui text-sm font-bold text-[#f0bc5a]">Paystack payment session</p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-secondary">Exact amount</p>
                        <p className="mt-1 font-ui text-sm font-bold text-[#4ecca3]">{fmt(verifyPreview.activeAttempt.expectedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Reference</p>
                        <p className="mt-1 break-all font-ui text-sm font-bold text-primary">{verifyPreview.activeAttempt.reference}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Status</p>
                        <p className="mt-1 font-ui text-sm font-bold text-primary">{verifyPreview.activeAttempt.status}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-[#20130e] p-3">
                      <p className="text-xs text-secondary">Paystack email</p>
                      <p className="mt-1 break-all font-ui text-sm font-bold text-primary">{verifyPreview.activeAttempt.paystackEmail}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-secondary">
                      Open Paystack, complete the payment with bank transfer, USSD, card, or bank, and then come back here. TradeBook will verify the payment and trigger payout to the saved savings account.
                    </p>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-[#e8a838]/25 bg-[#2d1b14] p-4 text-sm text-secondary">
                  <p className="font-ui text-sm font-bold text-[#f0bc5a]">Verification review</p>
                  <p className="mt-2 leading-6">{verifyPreview.message}</p>
                </div>

                {(verifyPreview.entry.payoutStatus || verifyPreview.entry.payoutFailureReason || verifyPreview.entry.payoutReference) ? (
                  <div className="rounded-2xl border border-white/10 bg-[#1f130e] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div>
                        <p className="label-base mb-1">Payout progress</p>
                        <p className="text-sm leading-6 text-secondary">
                          This shows whether TradeBook has started the Kora payout after Paystack verification.
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-ui font-bold uppercase tracking-[0.08em] ${payoutStatusTone(verifyPreview.entry.payoutStatus)}`}>
                        {verifyPreview.entry.payoutStatus ?? 'Not started'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-secondary">Payout reference</p>
                        <p className="mt-1 break-all font-ui text-sm font-bold text-primary">
                          {verifyPreview.entry.payoutReference || 'No payout reference yet'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Transferred at</p>
                        <p className="mt-1 font-ui text-sm font-bold text-primary">
                          {verifyPreview.entry.payoutTransferredAt
                            ? new Date(verifyPreview.entry.payoutTransferredAt).toLocaleString('en-NG')
                            : 'Not transferred yet'}
                        </p>
                      </div>
                    </div>
                    {verifyPreview.entry.payoutFailureReason ? (
                      <div className="mt-4 rounded-2xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.08)] p-3 text-sm text-[#fca5a5]">
                        {verifyPreview.entry.payoutFailureReason}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {verificationResult ? (
                  <div className="rounded-2xl border border-[#4ecca3]/25 bg-[rgba(78,204,163,0.12)] p-4 text-sm text-[#b8f0dd]">
                    <p className="font-ui text-sm font-bold text-[#4ecca3]">Verification completed</p>
                    <p className="mt-2 leading-6">{verificationResult.message}</p>
                    <p className="mt-2 text-xs text-[#d9f8ee]">Reference: {verificationResult.reference}</p>
                    <p className="mt-2 text-xs text-[#d9f8ee]">
                      Payout status: {verificationResult.entry.payoutStatus ?? 'Not started'}
                    </p>
                    {verificationResult.entry.payoutFailureReason ? (
                      <p className="mt-2 text-xs text-[#fca5a5]">
                        Failure reason: {verificationResult.entry.payoutFailureReason}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-primary w-full sm:w-auto"
                    disabled={!verifyPreview.canProceed || initiateVerification.isPending || verifyPreview.activeAttempt?.status === 'PENDING'}
                    onClick={() => void handleStartVerification()}
                  >
                    {initiateVerification.isPending
                      ? 'Generating...'
                      : verifyPreview.activeAttempt?.status === 'PENDING'
                        ? 'Payment session ready'
                        : verifyPreview.activeAttempt
                          ? 'Generate new payment session'
                          : 'Generate payment session'}
                  </button>
                  {verifyPreview.activeAttempt ? (
                    <button
                      type="button"
                      className="btn-secondary w-full sm:w-auto"
                      onClick={() => window.open(verifyPreview.activeAttempt!.paymentUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Open Paystack
                    </button>
                  ) : null}
                  {verifyPreview.activeAttempt ? (
                    <button
                      type="button"
                      className="btn-secondary w-full sm:w-auto"
                      disabled={confirmVerification.isPending}
                      onClick={() => void handleRefreshVerification()}
                    >
                      {confirmVerification.isPending ? 'Checking payment...' : 'I have sent the money'}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
