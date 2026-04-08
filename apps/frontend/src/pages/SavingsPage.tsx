import { useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCreateSavingsEntry, useSavingsEntries, useSavingsTodaySummary } from '@/hooks/useSavings'

const fmt = (n: number) => 'NGN ' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const toDateValue = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const SavingsPage = () => {
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'

  const [amount, setAmount] = useState('')
  const [savedDate, setSavedDate] = useState(() => toDateValue(new Date()))
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState(false)

  const createSavings = useCreateSavingsEntry()
  const { data: listData, isLoading } = useSavingsEntries()
  const { data: todaySummary } = useSavingsTodaySummary()

  const entries = listData?.pages.flatMap((p) => p.data) ?? []

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

  return (
    <div className="min-h-screen px-5 pb-8 pt-12 md:px-6 xl:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div>
          <p className="label-base mb-1">Daily saving</p>
          <h1 className="font-display text-3xl font-bold text-primary wonky">Savings</h1>
          <p className="mt-1 text-sm text-secondary">
            {isOwner
              ? 'Track daily savings for your business.'
              : 'Record today\'s savings. Owner can edit records later.'}
          </p>
        </div>

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

          <div className="mt-3 flex items-center gap-3">
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
                <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-ui text-sm font-semibold text-primary">
                      {new Date(entry.savedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="truncate text-xs text-secondary">{entry.note || 'No note'}</p>
                  </div>
                  <p className="font-display text-lg font-bold text-[#4ecca3] wonky">{fmt(entry.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
