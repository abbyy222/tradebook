import { useMemo, useState } from 'react'
import { MarketSceneBanner } from '@/components/MarketSceneBanner'
import { RecordSyncBadge } from '@/components/RecordSyncBadge'
import { useAuthStore } from '@/stores/authStore'
import {
  useAdjustStock,
  useCreateStockItem,
  useRetryStockSync,
  useStockList,
  useStockMovements,
  type StockAdjustmentReason,
} from '@/hooks/useStock'
import type { CreateStockItemDTO, StockItemDTO, StockMovementDTO } from '@tradebook/shared-types'

const fmt = (n: number) => 'N' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const SummaryCard = ({ label, value, sublabel }: { label: string; value: string; sublabel: string }) => (
  <div className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.05)' }}>
    <p className="label-base" style={{ marginBottom: 6 }}>{label}</p>
    <p className="font-display font-bold" style={{ fontSize: '1.2rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{value}</p>
    <p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.35)' }}>{sublabel}</p>
  </div>
)

const movementCopy: Record<StockMovementDTO['type'], { label: string; color: string }> = {
  INITIAL: { label: 'Initial stock', color: '#9fb0ff' },
  RESTOCK: { label: 'Restock', color: '#4ecca3' },
  SALE: { label: 'Sale', color: '#f0bc5a' },
  DAMAGE: { label: 'Damage', color: '#f87171' },
  CORRECTION: { label: 'Correction', color: '#c5b59b' },
}

const StockHistorySheet = ({ item, onClose }: { item: StockItemDTO; onClose: () => void }) => {
  const { data, isLoading } = useStockMovements(item.id, true)

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-2xl mx-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 flex flex-col gap-4 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display font-bold" style={{ fontSize: '1.45rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Stock history</h2>
            <p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.45)' }}>{item.itemName}</p>
          </div>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((idx) => <div key={idx} className="h-16 rounded-xl skeleton" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl px-4 py-5 text-sm text-secondary" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.08)' }}>
            No stock movements recorded yet for this item.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((movement) => {
              const meta = movementCopy[movement.type]
              const quantityLabel = movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : `${movement.quantityDelta}`
              return (
                <div key={movement.id} className="rounded-2xl px-4 py-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-ui font-bold text-xs uppercase tracking-[0.08em]" style={{ color: meta.color }}>{meta.label}</p>
                      <p className="mt-1 text-sm text-primary">{movement.note ?? 'Stock movement recorded'}</p>
                      <p className="mt-1 text-xs text-secondary">{new Date(movement.happenedAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold" style={{ color: movement.quantityDelta >= 0 ? '#4ecca3' : '#f87171' }}>{quantityLabel}</p>
                      <p className="mt-1 text-[11px] text-secondary">After: {movement.quantityAfter ?? '-'}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-secondary sm:grid-cols-2">
                    <p>Sell: <span className="text-primary">{movement.unitPrice != null ? fmt(movement.unitPrice) : '-'}</span></p>
                    <p>Cost: <span className="text-primary">{movement.costPrice != null ? fmt(movement.costPrice) : '-'}</span></p>
                    <p>Wholesale: <span className="text-primary">{movement.wholesalePrice != null ? fmt(movement.wholesalePrice) : '-'}</span></p>
                    <p>Min qty: <span className="text-primary">{movement.wholesaleMinQty ?? '-'}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const AddStockSheet = ({ onClose }: { onClose: () => void }) => {
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [wholesalePrice, setWholesalePrice] = useState('')
  const [wholesaleMinQty, setWholesaleMinQty] = useState('')
  const [threshold, setThreshold] = useState('5')
  const createStockItem = useCreateStockItem()
  const hasWholesalePairMismatch = (Boolean(wholesalePrice) && !wholesaleMinQty) || (!wholesalePrice && Boolean(wholesaleMinQty))

  const submit = () => {
    const payload: Omit<CreateStockItemDTO, 'id'> = {
      itemName: itemName.trim(),
      quantity: parseInt(quantity, 10),
      unitPrice: parseFloat(unitPrice),
      costPrice: parseFloat(costPrice),
      wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
      wholesaleMinQty: wholesaleMinQty ? parseInt(wholesaleMinQty, 10) : null,
      lowStockThreshold: parseInt(threshold, 10),
    }

    createStockItem.mutate(payload, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 flex flex-col gap-5 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <p className="label-base" style={{ marginBottom: 6 }}>Phase 2 accounting</p>
          <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Add stock item</h2>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Item name</label>
          <input type="text" autoFocus placeholder="e.g. Rice (50kg bag)" value={itemName} onChange={(e) => setItemName(e.target.value)} className="input-base" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="label-base">Qty in stock</label>
            <input type="number" inputMode="numeric" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input-base" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label-base">Selling price (N)</label>
            <input type="number" inputMode="decimal" placeholder="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="input-base" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="label-base">Cost price (N)</label>
            <input type="number" inputMode="decimal" placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="input-base" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label-base">Low stock alert at</label>
            <input type="number" inputMode="numeric" placeholder="5" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="input-base" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="label-base">Wholesale price (N)</label>
            <input type="number" inputMode="decimal" placeholder="Optional" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} className="input-base" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label-base">Wholesale starts at qty</label>
            <input type="number" inputMode="numeric" placeholder="Optional" value={wholesaleMinQty} onChange={(e) => setWholesaleMinQty(e.target.value)} className="input-base" />
          </div>
        </div>

        {hasWholesalePairMismatch ? (
          <p className="font-body text-xs" style={{ color: '#f87171' }}>Enter both wholesale price and the minimum quantity, or leave both blank.</p>
        ) : null}

        <p className="font-body text-xs" style={{ color: 'rgba(245,237,224,0.35)' }}>
          Cost price is what makes inventory accounting possible. Wholesale price stays separate so bulk sales can still keep a smaller margin.
        </p>

        <button
          onClick={submit}
          disabled={!itemName.trim() || !quantity || !unitPrice || !costPrice || hasWholesalePairMismatch || createStockItem.isPending}
          className="btn-primary mt-2"
        >
          {createStockItem.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Add item'}
        </button>
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
  const [unitPrice, setUnitPrice] = useState(String(item.unitPrice))
  const [costPrice, setCostPrice] = useState(String(item.costPrice))
  const [wholesalePrice, setWholesalePrice] = useState(item.wholesalePrice == null ? '' : String(item.wholesalePrice))
  const [wholesaleMinQty, setWholesaleMinQty] = useState(item.wholesaleMinQty == null ? '' : String(item.wholesaleMinQty))
  const [lowStockThreshold, setLowStockThreshold] = useState(String(item.lowStockThreshold))
  const adjustStock = useAdjustStock()
  const isReduction = reason === 'damage'
  const parsedUnitPrice = Number.parseFloat(unitPrice)
  const parsedCostPrice = Number.parseFloat(costPrice)
  const parsedWholesalePrice = wholesalePrice ? Number.parseFloat(wholesalePrice) : null
  const parsedWholesaleMinQty = wholesaleMinQty ? Number.parseInt(wholesaleMinQty, 10) : null
  const parsedThreshold = Number.parseInt(lowStockThreshold, 10)
  const hasWholesalePairMismatch = (Boolean(wholesalePrice) && !wholesaleMinQty) || (!wholesalePrice && Boolean(wholesaleMinQty))

  const submit = () => {
    const amount = quantity.trim() ? parseInt(quantity, 10) : 0
    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) return
    if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) return
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) return

    adjustStock.mutate(
      {
        stockItemId: item.id,
        delta: isReduction ? -amount : amount,
        reason,
        unitPrice: parsedUnitPrice,
        costPrice: parsedCostPrice,
        wholesalePrice: parsedWholesalePrice,
        wholesaleMinQty: parsedWholesaleMinQty,
        lowStockThreshold: parsedThreshold,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 flex flex-col gap-5 animate-slide-up max-h-[92vh] overflow-y-auto" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Adjust stock</h2>
          <p className="font-body text-sm mt-1" style={{ color: 'rgba(245,237,224,0.4)' }}>{item.itemName} currently has <span style={{ color: '#e8a838' }}>{item.quantity}</span> units.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Reason</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.entries(reasonLabels) as Array<[Exclude<StockAdjustmentReason, 'sale_adjustment'>, string]>).map(([value, label]) => (
              <button key={value} onClick={() => setReason(value)} className="rounded-xl px-3 py-3 font-ui font-bold text-xs" style={{ background: reason === value ? 'rgba(232,168,56,0.12)' : '#231510', color: reason === value ? '#f0bc5a' : 'rgba(245,237,224,0.5)', border: `1px solid ${reason === value ? 'rgba(232,168,56,0.28)' : 'rgba(255,255,255,0.06)'}` }}>{label}</button>
            ))}
          </div>
          <p className="font-body text-xs" style={{ color: 'rgba(245,237,224,0.3)' }}>Sales should reduce stock automatically. Use this for restocking, damage, or manual correction.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">{isReduction ? 'Quantity to remove' : 'Quantity to add'}</label>
          <input type="number" inputMode="numeric" placeholder="0 if you only want to change prices" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input-base" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="label-base">Selling price (N)</label>
            <input type="number" inputMode="decimal" placeholder="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="input-base" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label-base">Cost price (N)</label>
            <input type="number" inputMode="decimal" placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="input-base" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="label-base">Wholesale price (N)</label>
            <input type="number" inputMode="decimal" placeholder="Optional" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} className="input-base" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label-base">Wholesale starts at qty</label>
            <input type="number" inputMode="numeric" placeholder="Optional" value={wholesaleMinQty} onChange={(e) => setWholesaleMinQty(e.target.value)} className="input-base" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-base">Low stock alert at</label>
          <input type="number" inputMode="numeric" placeholder="5" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} className="input-base" />
        </div>

        {hasWholesalePairMismatch ? (
          <p className="font-body text-xs" style={{ color: '#f87171' }}>Enter both wholesale price and the minimum quantity, or clear both.</p>
        ) : null}

        {!quantity.trim() ? (
          <p className="font-body text-xs" style={{ color: 'rgba(245,237,224,0.35)' }}>Leave quantity at 0 if you only want to update selling, cost, wholesale, or low-stock values.</p>
        ) : null}

        <button
          onClick={submit}
          disabled={(!quantity.trim() && unitPrice === String(item.unitPrice) && costPrice === String(item.costPrice) && wholesalePrice === (item.wholesalePrice == null ? '' : String(item.wholesalePrice)) && wholesaleMinQty === (item.wholesaleMinQty == null ? '' : String(item.wholesaleMinQty)) && lowStockThreshold === String(item.lowStockThreshold)) || (quantity.trim() && parseInt(quantity, 10) < 0) || !Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0 || !Number.isFinite(parsedCostPrice) || parsedCostPrice < 0 || hasWholesalePairMismatch || !Number.isFinite(parsedThreshold) || parsedThreshold < 0 || adjustStock.isPending}
          className="btn-primary"
        >
          {adjustStock.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Save adjustment'}
        </button>
      </div>
    </div>
  )
}

export const StockPage = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StockItemDTO | null>(null)
  const [historyItem, setHistoryItem] = useState<StockItemDTO | null>(null)
  const [search, setSearch] = useState('')
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
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
      <div className="px-4 pb-6 pt-8 sm:px-5 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <MarketSceneBanner
            image="/market-scenes/dashboard-market-1.jpg"
            eyebrow="Inventory"
            title="Stock"
            description="Cost-aware inventory for valuation, retail sales, and bulk wholesale pricing."
            badge="Goods in hand"
          >
            {isOwner ? (
              <button onClick={() => setAddOpen(true)} className="rounded-xl px-4 py-2.5 font-ui font-bold text-sm shrink-0" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ Add</button>
            ) : null}
          </MarketSceneBanner>
        </div>
      </div>

      <div className="px-4 sm:px-5 max-w-6xl mx-auto flex flex-col gap-4 pb-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Cost of goods left" value={fmt(summary.stockValue)} sublabel="How much your remaining goods cost" />
          <SummaryCard label="If sold now" value={fmt(summary.retailValue)} sublabel="Possible money in from goods left" />
          <SummaryCard label="Possible profit" value={fmt(summary.expectedGrossProfit)} sublabel="Selling value minus cost" />
          <SummaryCard label="Items left" value={summary.units.toLocaleString('en-NG')} sublabel="How many goods are left" />
        </div>

        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(245,237,224,0.25)' }}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input type="search" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base" style={{ paddingLeft: '2.75rem' }} />
        </div>

        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)
        ) : items.length === 0 ? (
          <div className="relative overflow-hidden rounded-[26px] border border-white/10 px-5 py-12 text-center" style={{ background: '#231510' }}>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(20,13,10,0.62) 0%, rgba(20,13,10,0.86) 100%), url('/market-scenes/dashboard-market-1.jpg')",
              }}
            />
            <div className="pointer-events-none absolute inset-0 pattern-dots opacity-25" />
            <div className="relative flex flex-col items-center gap-3">
              <span className="text-[#f0bc5a]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M12 3v18M4 7l8 4 8-4M8.5 11.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{search ? 'No items found' : 'No stock yet'}</p>
              <p className="max-w-sm font-body text-sm" style={{ color: 'rgba(245,237,224,0.42)' }}>
                {search ? 'Try another item name or clear the search.' : 'Start with your first item so TradeBook can watch quantity, stock value, and expected margin.'}
              </p>
              {!search && isOwner ? (
                <button onClick={() => setAddOpen(true)} className="mt-2 rounded-xl px-4 py-2.5 font-ui font-bold text-sm" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>
                  Add first item
                </button>
              ) : null}
            </div>
          </div>
        ) : false ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span style={{ fontSize: '2rem' }}>📦</span>
            <p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{search ? 'No items found' : 'No stock yet'}</p>
            <p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>{search ? 'Try a different search' : 'Tap "+ Add" to track your first item'}</p>
          </div>
        ) : items.map((item) => {
          const isLow = item.quantity <= (item.lowStockThreshold ?? 5)
          const wholesaleLabel = item.wholesalePrice != null && item.wholesaleMinQty != null
            ? `Wholesale ${fmt(item.wholesalePrice)} from ${item.wholesaleMinQty} units · `
            : ''
          const normalizedWholesaleLabel = wholesaleLabel.replace(/\u00C2/g, '')
          const pricingSummary = `Sell ${fmt(item.unitPrice)} · Cost ${fmt(item.costPrice)}`
          const valuationSummary = `${normalizedWholesaleLabel}Stock value ${fmt(item.stockValue)} · Margin room ${fmt(item.expectedGrossProfit)}`

          return (
            <div key={item.id} className="rounded-2xl px-4 py-4 flex flex-col items-stretch gap-3 sm:px-5 sm:flex-row sm:items-center sm:gap-4" style={{ background: '#231510', border: `1px solid ${isLow ? 'rgba(226,75,74,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
              <div className="rounded-xl flex items-center justify-center font-mono font-semibold flex-shrink-0" style={{ width: 44, height: 44, background: isLow ? 'rgba(226,75,74,0.12)' : 'rgba(78,204,163,0.08)', color: isLow ? '#f87171' : '#4ecca3', fontSize: '0.8rem' }}>
                {item.quantity}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-ui font-semibold text-sm truncate" style={{ color: '#f5ede0' }}>{item.itemName}</p>
                <p className="hidden font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>
                  Sell {fmt(item.unitPrice)} · Cost {fmt(item.costPrice)}
                  {isLow && <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>· Low stock!</span>}
                </p>
                <p className="hidden font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.28)' }}>
                  {wholesaleLabel}
                  Stock value {fmt(item.stockValue)} · Margin room {fmt(item.expectedGrossProfit)}
                </p>
                <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>
                  {pricingSummary}
                  {isLow && <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>· Low stock!</span>}
                </p>
                <p className="font-body text-xs mt-1" style={{ color: 'rgba(245,237,224,0.28)' }}>
                  {valuationSummary}
                </p>
              </div>

              <div className="flex flex-col items-stretch gap-2 flex-shrink-0 sm:items-end">
                <p className="font-display font-bold" style={{ fontSize: '0.95rem', color: '#e8a838', fontVariationSettings: "'WONK' 1" }}>{fmt(item.retailValue)}</p>
                <RecordSyncBadge syncStatus={item.syncStatus} onRetry={item.syncStatus === 'FAILED' ? () => retryStockSync.mutate() : undefined} />
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button onClick={() => setHistoryItem(item)} className="rounded-full px-3 py-1 font-ui font-bold text-xs" style={{ background: 'rgba(159,176,255,0.12)', color: '#9fb0ff', border: '1px solid rgba(159,176,255,0.2)' }}>History</button>
                  {isOwner && <button onClick={() => setSelectedItem(item)} className="rounded-full px-3 py-1 font-ui font-bold text-xs" style={{ background: 'rgba(78,204,163,0.12)', color: '#4ecca3', border: '1px solid rgba(78,204,163,0.2)' }}>Adjust</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {isOwner && addOpen && <AddStockSheet onClose={() => setAddOpen(false)} />}
      {isOwner && selectedItem && <AdjustStockSheet item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {historyItem && <StockHistorySheet item={historyItem} onClose={() => setHistoryItem(null)} />}
    </div>
  )
}
