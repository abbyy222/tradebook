import { useState } from 'react'
import { RecordSyncBadge } from '@/components/RecordSyncBadge'
import { useCreateExpense, useExpensesList, useRetryExpensesSync } from '@/hooks/useExpenses'

const fmt = (n: number) => 'N' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const CATEGORIES = ['transport', 'restock', 'food', 'market_fees', 'packaging', 'equipment', 'other'] as const
type Category = (typeof CATEGORIES)[number]

const CAT_COLORS: Record<Category, string> = {
  transport: '#7585c8',
  restock: '#e8a838',
  food: '#4ecca3',
  market_fees: '#f0bc5a',
  packaging: '#c4622d',
  equipment: '#e08b5a',
  other: 'rgba(245,237,224,0.4)',
}

const CATEGORY_LABELS: Record<Category, string> = {
  transport: 'Transport',
  restock: 'Restock',
  food: 'Food',
  market_fees: 'Market fees',
  packaging: 'Packaging',
  equipment: 'Equipment',
  other: 'Other',
}

const AddExpenseSheet = ({ onClose }: { onClose: () => void }) => {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('restock')
  const mutation = useCreateExpense()

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Add expense</h2>
        <div className="flex flex-col gap-2"><label className="label-base">Description</label><input type="text" autoFocus placeholder="e.g. Market supplies, Taxi..." value={description} onChange={e => setDescription(e.target.value)} className="input-base" /></div>
        <div className="flex flex-col gap-2"><label className="label-base">Amount (N)</label><input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-base" style={{ fontFamily: "'Fraunces', serif", fontSize: '1.25rem', fontVariationSettings: "'WONK' 1" }} /></div>
        <div className="flex flex-col gap-2"><label className="label-base">Category</label><div className="flex flex-wrap gap-2">{CATEGORIES.map(cat => <button key={cat} onClick={() => setCategory(cat)} className="rounded-full px-3 py-1.5 font-ui font-bold text-xs transition-all duration-150" style={{ background: category === cat ? CAT_COLORS[cat] + '22' : 'rgba(255,255,255,0.04)', border: `1px solid ${category === cat ? CAT_COLORS[cat] + '55' : 'rgba(255,255,255,0.07)'}`, color: category === cat ? CAT_COLORS[cat] : 'rgba(245,237,224,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.62rem' }}>{CATEGORY_LABELS[cat]}</button>)}</div></div>
        <button onClick={() => mutation.mutate({ description: description.trim(), amount: parseFloat(amount), category, spentAt: new Date().toISOString() }, { onSuccess: onClose })} disabled={!description.trim() || !amount || parseFloat(amount) <= 0 || mutation.isPending} className="btn-primary mt-2">{mutation.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Save expense'}</button>
      </div>
    </div>
  )
}

export const ExpensesPage = () => {
  const [sheetOpen, setSheetOpen] = useState(false)
  const retryExpensesSync = useRetryExpensesSync()
  const { data, isLoading } = useExpensesList()
  const allExpenses = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden px-5 pt-12 pb-6" style={{ background: 'linear-gradient(180deg, rgba(232,168,56,0.12) 0%, transparent 100%)' }}>
        <div className="relative z-10 flex items-center justify-between max-w-lg mx-auto">
          <div><p className="label-base mb-0.5">Track</p><h1 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Expenses</h1></div>
          <button onClick={() => setSheetOpen(true)} className="rounded-xl px-4 py-2.5 font-ui font-bold text-sm" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ Add</button>
        </div>
      </div>

      <div className="px-5 max-w-lg mx-auto flex flex-col gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-2.5 mt-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
        ) : allExpenses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center"><span style={{ fontSize: '2rem' }}>Expenses</span><p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>No expenses yet</p><p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>Tap "+ Add" to track your first expense</p></div>
        ) : (
          allExpenses.map((expense: any) => (
            <div key={expense.id} className="flex items-center gap-4 rounded-xl px-4 py-3.5" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: CAT_COLORS[expense.category as Category] ?? '#888' }} />
              <div className="flex-1 min-w-0"><p className="font-ui font-semibold text-sm truncate" style={{ color: '#f5ede0' }}>{expense.description}</p><p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>{CATEGORY_LABELS[expense.category as Category] ?? expense.category} · {new Date(expense.spentAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p></div>
              <div className="flex flex-col items-end gap-2"><p className="font-display font-bold" style={{ fontSize: '1rem', color: '#f87171', fontVariationSettings: "'WONK' 1" }}>{fmt(expense.amount)}</p><RecordSyncBadge syncStatus={expense.syncStatus} onRetry={expense.syncStatus === 'FAILED' ? () => retryExpensesSync.mutate() : undefined} /></div>
            </div>
          ))
        )}
      </div>

      {sheetOpen && <AddExpenseSheet onClose={() => setSheetOpen(false)} />}
    </div>
  )
}
