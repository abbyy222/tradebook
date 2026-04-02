import { useMemo, useState } from 'react'
import { RecordSyncBadge } from '@/components/RecordSyncBadge'
import {
  useAdjustStock,
  useCreateStockItem,
  useRetryStockSync,
  useStockList,
  type StockAdjustmentReason,
} from '@/hooks/useStock'
import type { CreateStockItemDTO, StockItemDTO } from '@tradebook/shared-types'

const fmt = (n: number) => 'N' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const SummaryCard = ({ label, value, sublabel }: { label: string; value: string; sublabel: string }) => (
  <div className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.05)' }}>
    <p className="label-base" style={{ marginBottom: 6 }}>{label}</p>
    <p className="font-display font-bold" style={{ fontSize: '1.2rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{value}</p>
    <p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.35)' }}>{sublabel}</p>
  </div>
)

const AddStockSheet = ({ onClose }: { onClose: () => void }) => {
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [threshold, setThreshold] = useState('5')
  const createStockItem = useCreateStockItem()

  const submit = () => {
    const payload: Omit<CreateStockItemDTO, 'id'> = {
      itemName: itemName.trim(),
      quantity: parseInt(quantity, 10),
      unitPrice: parseFloat(unitPrice),
      costPrice: parseFloat(costPrice),
      lowStockThreshold: parseInt(threshold, 10),
    }

    createStockItem.mutate(payload, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <p className="label-base" style={{ marginBottom: 6 }}>Phase 2 accounting</p>
          <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Add stock item</h2>
        </div>
        <div className="flex flex-col gap-2"><label className="label-base">Item name</label><input type="text" autoFocus placeholder="e.g. Rice (50kg bag)" value={itemName} onChange={e => setItemName(e.target.value)} className="input-base" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2"><label className="label-base">Qty in stock</label><input type="number" inputMode="numeric" placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="input-base" /></div>
          <div className="flex flex-col gap-2"><label className="label-base">Selling price (N)</label><input type="number" inputMode="decimal" placeholder="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="input-base" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2"><label className="label-base">Cost price (N)</label><input type="number" inputMode="decimal" placeholder="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="input-base" /></div>
          <div className="flex flex-col gap-2"><label className="label-base">Low stock alert at</label><input type="number" inputMode="numeric" placeholder="5" value={threshold} onChange={e => setThreshold(e.target.value)} className="input-base" /></div>
        </div>
        <p className="font-body text-xs" style={{ color: 'rgba(245,237,224,0.35)' }}>Cost price is what makes inventory accounting possible. It lets us value stock correctly and prepares the app for profit and loss.</p>
        <button onClick={submit} disabled={!itemName.trim() || !quantity || !unitPrice || !costPrice || createStockItem.isPending} className="btn-primary mt-2">{createStockItem.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Add item'}</button>
      </div>
    </div>
  )
}

const reasonLabels: Record<Exclude<StockAdjustmentReason, 'sale_adjustment'>, string> = {
  restock: 'Restock',
  damage: 'Damage',
  correction: 'Correction',
}

const AdjustStockSheet = ({ item, onClose }: { item: StockItemDTO; onClose: () => void }) => {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<Exclude<StockAdjustmentReason, 'sale_adjustment'>>('restock')
  const adjustStock = useAdjustStock()
  const isReduction = reason === 'damage'

  const submit = () => {
    const amount = parseInt(quantity, 10)
    if (!amount || amount <= 0) return
    adjustStock.mutate({ stockItemId: item.id, delta: isReduction ? -amount : amount, reason }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div><h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Adjust stock</h2><p className="font-body text-sm mt-1" style={{ color: 'rgba(245,237,224,0.4)' }}>{item.itemName} currently has <span style={{ color: '#e8a838' }}>{item.quantity}</span> units.</p></div>
        <div className="flex flex-col gap-2"><label className="label-base">Reason</label><div className="grid grid-cols-3 gap-2">{(Object.entries(reasonLabels) as Array<[Exclude<StockAdjustmentReason, 'sale_adjustment'>, string]>).map(([value, label]) => <button key={value} onClick={() => setReason(value)} className="rounded-xl px-3 py-3 font-ui font-bold text-xs" style={{ background: reason === value ? 'rgba(232,168,56,0.12)' : '#231510', color: reason === value ? '#f0bc5a' : 'rgba(245,237,224,0.5)', border: `1px solid ${reason === value ? 'rgba(232,168,56,0.28)' : 'rgba(255,255,255,0.06)'}` }}>{label}</button>)}</div><p className="font-body text-xs" style={{ color: 'rgba(245,237,224,0.3)' }}>Sales should reduce stock automatically. Use this for restocking, damage, or manual correction.</p></div>
        <div className="flex flex-col gap-2"><label className="label-base">{isReduction ? 'Quantity to remove' : 'Quantity to add'}</label><input type="number" inputMode="numeric" placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="input-base" /></div>
        <button onClick={submit} disabled={!quantity || parseInt(quantity, 10) <= 0 || adjustStock.isPending} className="btn-primary">{adjustStock.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Save adjustment'}</button>
      </div>
    </div>
  )
}

export const StockPage = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItemDTO | null>(null)
  const [search, setSearch] = useState('')
  const retryStockSync = useRetryStockSync()
  const { data, isLoading } = useStockList({ search: search || undefined })
  const items = data?.pages.flatMap((page) => page.data) ?? []

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.units += item.quantity
        acc.stockValue += item.stockValue
        acc.retailValue += item.retailValue
        acc.expectedGrossProfit += item.expectedGrossProfit
        return acc
      },
      { units: 0, stockValue: 0, retailValue: 0, expectedGrossProfit: 0 },
    )
  }, [items])

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden px-5 pt-12 pb-6" style={{ background: 'linear-gradient(180deg, rgba(78,204,163,0.1) 0%, transparent 100%)' }}>
        <div className="relative z-10 flex items-center justify-between max-w-6xl mx-auto gap-4"><div><p className="label-base mb-0.5">Inventory</p><h1 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Stock</h1><p className="font-body text-sm mt-1" style={{ color: 'rgba(245,237,224,0.45)' }}>Cost-aware inventory for valuation and future profit reporting.</p></div><button onClick={() => setAddOpen(true)} className="rounded-xl px-4 py-2.5 font-ui font-bold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ Add</button></div>
      </div>

      <div className="px-5 max-w-6xl mx-auto flex flex-col gap-4 pb-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Cost of goods left" value={fmt(summary.stockValue)} sublabel="How much your remaining goods cost" />
          <SummaryCard label="If sold now" value={fmt(summary.retailValue)} sublabel="Possible money in from goods left" />
          <SummaryCard label="Possible profit" value={fmt(summary.expectedGrossProfit)} sublabel="Selling value minus cost" />
          <SummaryCard label="Items left" value={summary.units.toLocaleString('en-NG')} sublabel="How many goods are left" />
        </div>

        <div className="relative"><svg className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(245,237,224,0.25)' }}><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg><input type="search" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="input-base" style={{ paddingLeft: '2.75rem' }} /></div>

        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center"><span style={{ fontSize: '2rem' }}>📦</span><p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{search ? 'No items found' : 'No stock yet'}</p><p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>{search ? 'Try a different search' : 'Tap "+ Add" to track your first item'}</p></div>
        ) : items.map((item) => {
          const isLow = item.quantity <= (item.lowStockThreshold ?? 5)
          return <div key={item.id} className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#231510', border: `1px solid ${isLow ? 'rgba(226,75,74,0.2)' : 'rgba(255,255,255,0.06)'}` }}><div className="rounded-xl flex items-center justify-center font-mono font-semibold flex-shrink-0" style={{ width: 44, height: 44, background: isLow ? 'rgba(226,75,74,0.12)' : 'rgba(78,204,163,0.08)', color: isLow ? '#f87171' : '#4ecca3', fontSize: '0.8rem' }}>{item.quantity}</div><div className="flex-1 min-w-0"><p className="font-ui font-semibold text-sm truncate" style={{ color: '#f5ede0' }}>{item.itemName}</p><p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>Sell {fmt(item.unitPrice)} · Cost {fmt(item.costPrice)}{isLow && <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>· Low stock!</span>}</p><p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.28)' }}>Stock value {fmt(item.stockValue)} · Margin room {fmt(item.expectedGrossProfit)}</p></div><div className="flex flex-col items-end gap-2 flex-shrink-0"><p className="font-display font-bold" style={{ fontSize: '0.95rem', color: '#e8a838', fontVariationSettings: "'WONK' 1" }}>{fmt(item.retailValue)}</p><RecordSyncBadge syncStatus={item.syncStatus} onRetry={item.syncStatus === 'FAILED' ? () => retryStockSync.mutate() : undefined} /><button onClick={() => setSelectedItem(item)} className="rounded-full px-3 py-1 font-ui font-bold text-xs" style={{ background: 'rgba(78,204,163,0.12)', color: '#4ecca3', border: '1px solid rgba(78,204,163,0.2)' }}>Adjust</button></div></div>
        })}
      </div>

      {addOpen && <AddStockSheet onClose={() => setAddOpen(false)} />}
      {selectedItem && <AdjustStockSheet item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  )
}



