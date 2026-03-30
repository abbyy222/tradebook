import { useMemo, useState } from 'react'
import { RecordSyncBadge } from '@/components/RecordSyncBadge'
import {
  useCreateExpense,
  useExpensesList,
  useRetryExpensesSync,
  type ExpenseListFilters,
} from '@/hooks/useExpenses'
import {
  EXPENSE_CATEGORIES,
  type CreateExpenseDTO,
  type ExpenseCategory,
  type ExpenseDTO,
  type ExpenseFrequency,
  type ExpenseType,
} from '@tradebook/shared-types'

const fmt = (n: number) => 'N' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })
const toDateInput = (date = new Date()) => date.toISOString().slice(0, 10)
const toIsoFromDateInput = (value: string, hour = 12) => new Date(`${value}T${String(hour).padStart(2, '0')}:00:00`).toISOString()

type TimeScope = 'TODAY' | 'THIS_MONTH' | 'THIS_YEAR'
type FrequencyFilter = 'ALL' | 'ONE_TIME' | 'DAILY' | 'MONTHLY' | 'YEARLY'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RESTOCK: 'Restock',
  TRANSPORT: 'Transport',
  MARKET_FEES: 'Market fees',
  PACKAGING: 'Packaging',
  EQUIPMENT: 'Equipment',
  FOOD: 'Food',
  RENT: 'Rent',
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  SALARY: 'Salary',
  LEVY: 'Levy',
  REPAIRS: 'Repairs',
  UTILITIES: 'Utilities',
  OTHER: 'Other',
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  RESTOCK: '#e8a838',
  TRANSPORT: '#7585c8',
  MARKET_FEES: '#f0bc5a',
  PACKAGING: '#c4622d',
  EQUIPMENT: '#e08b5a',
  FOOD: '#4ecca3',
  RENT: '#c9475b',
  ELECTRICITY: '#ff9f43',
  WATER: '#52b6ff',
  SALARY: '#b983ff',
  LEVY: '#d96c31',
  REPAIRS: '#ff6b6b',
  UTILITIES: '#8fd694',
  OTHER: 'rgba(245,237,224,0.4)',
}

const buildWindow = (scope: TimeScope) => {
  const now = new Date()
  const from = new Date(now)

  if (scope === 'TODAY') {
    from.setHours(0, 0, 0, 0)
  } else if (scope === 'THIS_MONTH') {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  } else {
    from.setMonth(0, 1)
    from.setHours(0, 0, 0, 0)
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  }
}

const buildFrequencyFilters = (value: FrequencyFilter): Pick<ExpenseListFilters, 'expenseType' | 'frequency'> => {
  switch (value) {
    case 'ONE_TIME':
      return { expenseType: 'ONE_TIME' }
    case 'DAILY':
      return { expenseType: 'RECURRING', frequency: 'DAILY' }
    case 'MONTHLY':
      return { expenseType: 'RECURRING', frequency: 'MONTHLY' }
    case 'YEARLY':
      return { expenseType: 'RECURRING', frequency: 'YEARLY' }
    default:
      return {}
  }
}

const SummaryCard = ({ label, value, sublabel }: { label: string; value: string; sublabel: string }) => (
  <div className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.05)' }}>
    <p className="label-base" style={{ marginBottom: 6 }}>{label}</p>
    <p className="font-display font-bold" style={{ fontSize: '1.3rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{value}</p>
    <p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.35)' }}>{sublabel}</p>
  </div>
)

const AddExpenseSheet = ({ onClose }: { onClose: () => void }) => {
  const mutation = useCreateExpense()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('RESTOCK')
  const [expenseType, setExpenseType] = useState<ExpenseType>('ONE_TIME')
  const [frequency, setFrequency] = useState<ExpenseFrequency>('MONTHLY')
  const [expenseDate, setExpenseDate] = useState(toDateInput())
  const [startDate, setStartDate] = useState(toDateInput())
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')

  const isRecurring = expenseType === 'RECURRING'

  const saveExpense = () => {
    const parsedAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    if (isRecurring && endDate && endDate < startDate) return

    const payload: Omit<CreateExpenseDTO, 'id'> = {
      description: description.trim(),
      amount: parsedAmount,
      category,
      expenseType,
      spentAt: toIsoFromDateInput(isRecurring ? startDate : expenseDate),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(isRecurring
        ? {
            frequency,
            startDate: toIsoFromDateInput(startDate),
            ...(endDate ? { endDate: toIsoFromDateInput(endDate) } : {}),
          }
        : {}),
    }

    mutation.mutate(payload, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-4 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <p className="label-base" style={{ marginBottom: 6 }}>Phase 1 accounting</p>
          <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Add expense</h2>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Description</label>
          <input type="text" autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Shop rent, diesel, market levy" className="input-base" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="label-base">Amount (N)</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="input-base" />
          </div>
          {!isRecurring ? (
            <div className="flex flex-col gap-2">
              <label className="label-base">Date spent</label>
              <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="input-base" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="input-base">
            {EXPENSE_CATEGORIES.map((option) => (
              <option key={option} value={option}>{CATEGORY_LABELS[option]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Expense type</label>
          <div className="grid grid-cols-2 gap-2">
            {(['ONE_TIME', 'RECURRING'] as ExpenseType[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setExpenseType(value)}
                className="rounded-xl px-3 py-3 text-sm font-ui font-bold transition-all"
                style={{
                  background: expenseType === value ? 'rgba(232,168,56,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${expenseType === value ? 'rgba(232,168,56,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  color: expenseType === value ? '#f0bc5a' : 'rgba(245,237,224,0.6)',
                }}
              >
                {value === 'ONE_TIME' ? 'One-time' : 'Recurring'}
              </button>
            ))}
          </div>
        </div>

        {isRecurring && (
          <>
            <div className="flex flex-col gap-2">
              <label className="label-base">Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {(['DAILY', 'MONTHLY', 'YEARLY'] as ExpenseFrequency[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFrequency(value)}
                    className="rounded-xl px-3 py-3 text-xs font-ui font-bold uppercase tracking-[0.08em] transition-all"
                    style={{
                      background: frequency === value ? 'rgba(78,204,163,0.16)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${frequency === value ? 'rgba(78,204,163,0.45)' : 'rgba(255,255,255,0.07)'}`,
                      color: frequency === value ? '#4ecca3' : 'rgba(245,237,224,0.6)',
                    }}
                  >
                    {value.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="label-base">Starts on</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-base" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="label-base">Ends on</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-base" />
                <p className="font-body text-xs" style={{ color: endDate && endDate < startDate ? '#f87171' : 'rgba(245,237,224,0.35)' }}>{endDate && endDate < startDate ? 'End date cannot be before start date.' : 'Recurring expenses use only these two dates. Next due date is calculated automatically.'}</p>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <label className="label-base">Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for audit and profit/loss review" className="input-base min-h-24 resize-none" />
        </div>

        <button onClick={saveExpense} disabled={mutation.isPending || !description.trim() || Number(amount) <= 0 || (isRecurring && !!endDate && endDate < startDate)} className="btn-primary mt-2">
          {mutation.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Save expense'}
        </button>
      </div>
    </div>
  )
}

export const ExpensesPage = () => {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [timeScope, setTimeScope] = useState<TimeScope>('TODAY')
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL')
  const retryExpensesSync = useRetryExpensesSync()

  const rangeFilters = useMemo(() => buildWindow(timeScope), [timeScope])
  const accountingFilters = useMemo(() => buildFrequencyFilters(frequencyFilter), [frequencyFilter])
  const filters = useMemo<ExpenseListFilters>(() => ({
    ...rangeFilters,
    ...accountingFilters,
    ...(categoryFilter === 'ALL' ? {} : { category: categoryFilter }),
  }), [accountingFilters, categoryFilter, rangeFilters])

  const { data, isLoading } = useExpensesList(filters)
  const allExpenses = data?.pages.flatMap((page) => page.data) ?? []

  const totals = useMemo(() => {
    return allExpenses.reduce(
      (acc, expense) => {
        acc.total += expense.amount
        if (expense.expenseType === 'RECURRING') {
          acc.recurring += expense.amount
        } else {
          acc.oneTime += expense.amount
        }
        return acc
      },
      { total: 0, recurring: 0, oneTime: 0 },
    )
  }, [allExpenses])

  const periodLabel = timeScope === 'TODAY' ? 'Today' : timeScope === 'THIS_MONTH' ? 'This month' : 'This year'

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden px-5 pt-12 pb-6" style={{ background: 'linear-gradient(180deg, rgba(232,168,56,0.12) 0%, transparent 100%)' }}>
        <div className="relative z-10 flex items-center justify-between max-w-6xl mx-auto gap-4">
          <div>
            <p className="label-base mb-0.5">Track</p>
            <h1 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Expenses</h1>
            <p className="font-body text-sm mt-1" style={{ color: 'rgba(245,237,224,0.45)' }}>Daily, monthly, and yearly spending in one flow.</p>
          </div>
          <button onClick={() => setSheetOpen(true)} className="rounded-xl px-4 py-2.5 font-ui font-bold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ Add</button>
        </div>
      </div>

      <div className="px-5 max-w-6xl mx-auto flex flex-col gap-4 pb-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label={periodLabel} value={fmt(totals.total)} sublabel="Total spent" />
          <SummaryCard label="Recurring" value={fmt(totals.recurring)} sublabel="Rent, utility, salary" />
          <SummaryCard label="One-time" value={fmt(totals.oneTime)} sublabel="Ad-hoc business spend" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['TODAY', 'THIS_MONTH', 'THIS_YEAR'] as TimeScope[]).map((scope) => (
            <button
              key={scope}
              onClick={() => setTimeScope(scope)}
              className="rounded-full px-3 py-2 font-ui font-bold text-xs uppercase tracking-[0.08em]"
              style={{
                background: timeScope === scope ? 'rgba(232,168,56,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${timeScope === scope ? 'rgba(232,168,56,0.45)' : 'rgba(255,255,255,0.07)'}`,
                color: timeScope === scope ? '#f0bc5a' : 'rgba(245,237,224,0.55)',
              }}
            >
              {scope === 'TODAY' ? 'Today' : scope === 'THIS_MONTH' ? 'This month' : 'This year'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['ALL', 'ONE_TIME', 'DAILY', 'MONTHLY', 'YEARLY'] as FrequencyFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => setFrequencyFilter(value)}
              className="rounded-full px-3 py-2 font-ui font-bold text-xs uppercase tracking-[0.08em]"
              style={{
                background: frequencyFilter === value ? 'rgba(78,204,163,0.16)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${frequencyFilter === value ? 'rgba(78,204,163,0.45)' : 'rgba(255,255,255,0.07)'}`,
                color: frequencyFilter === value ? '#4ecca3' : 'rgba(245,237,224,0.55)',
              }}
            >
              {value === 'ALL' ? 'All' : value === 'ONE_TIME' ? 'One time' : value.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Category filter</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | ExpenseCategory)} className="input-base">
            <option value="ALL">All categories</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2.5 mt-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl skeleton" />)}</div>
        ) : allExpenses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span style={{ fontSize: '2rem' }}>📚</span>
            <p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>No expenses in this view</p>
            <p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>This Phase 1 screen now separates period and recurrence so you can review operational spend more like accounting.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allExpenses.map((expense: ExpenseDTO) => (
              <div key={expense.id} className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-start gap-4">
                  <div className="rounded-full flex-shrink-0 mt-2" style={{ width: 8, height: 8, background: CATEGORY_COLORS[expense.category] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-ui font-semibold text-sm truncate" style={{ color: '#f5ede0' }}>{expense.description}</p>
                        <p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.4)' }}>
                          {CATEGORY_LABELS[expense.category]} · {new Date(expense.spentAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <p className="font-display font-bold shrink-0" style={{ fontSize: '1rem', color: '#f87171', fontVariationSettings: "'WONK' 1" }}>{fmt(expense.amount)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-ui font-bold uppercase tracking-[0.08em]" style={{ background: 'rgba(232,168,56,0.15)', color: '#f0bc5a' }}>
                        {expense.expenseType === 'RECURRING' ? `${expense.frequency?.toLowerCase() ?? 'recurring'}` : 'one time'}
                      </span>
                      {expense.note ? (
                        <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-ui font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(245,237,224,0.55)' }}>
                          Note saved
                        </span>
                      ) : null}
                      {expense.nextDueDate ? (
                        <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-ui font-bold" style={{ background: 'rgba(78,204,163,0.12)', color: '#4ecca3' }}>
                          Next due {new Date(expense.nextDueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-3">
                  <RecordSyncBadge syncStatus={expense.syncStatus} onRetry={expense.syncStatus === 'FAILED' ? () => retryExpensesSync.mutate() : undefined} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sheetOpen && <AddExpenseSheet onClose={() => setSheetOpen(false)} />}
    </div>
  )
}

