import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RecordSaleWizard } from '@/components/RecordSaleWizard'
import { RecordSyncBadge } from '@/components/RecordSyncBadge'
import { useRetrySalesSync, useSalesList } from '@/hooks/useSales'
import { useAuthStore } from '@/stores/authStore'
import { buildReceiptText, printReceipt } from '@/utils/receipt'
import type { SaleDTO } from '@tradebook/shared-types'

type FilterType = 'ALL' | 'CASH' | 'TRANSFER' | 'DEBT'
type HistoryRange = 'ALL_TIME' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS'

const fmt = (n: number) => 'N' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const PAYMENT_COLORS: Record<string, { color: string; bg: string }> = {
  CASH: { color: '#4ecca3', bg: 'rgba(78,204,163,0.12)' },
  TRANSFER: { color: '#7585c8', bg: 'rgba(117,133,200,0.12)' },
  DEBT: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const HISTORY_LABELS: Record<HistoryRange, string> = {
  ALL_TIME: 'All time',
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  LAST_7_DAYS: 'Last 7 days',
}

const SalesDetailSheet = ({ sale, onClose }: { sale: SaleDTO; onClose: () => void }) => {
  const paymentTheme = PAYMENT_COLORS[sale.paymentType] ?? PAYMENT_COLORS.CASH
  const trader = useAuthStore((state) => state.trader)
  const [receiptBusy, setReceiptBusy] = useState(false)

  const receiptPayload = {
    receiptNumber: sale.id.slice(0, 8).toUpperCase(),
    businessName: trader?.businessName ?? trader?.name ?? 'Tradebook',
    traderName: trader?.name,
    phoneNumber: trader?.phoneNumber,
    soldAt: sale.soldAt,
    itemName: sale.itemName,
    quantity: sale.quantity ?? 1,
    unitPrice: sale.unitPrice ?? sale.amount,
    amount: sale.amount,
    paymentType: sale.paymentType,
  } as const

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-start justify-between gap-4">
          <div><p className="label-base mb-1">Sale details</p><h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>{sale.itemName}</h2></div>
          <span className="rounded-full px-3 py-1 font-ui font-bold text-[11px]" style={{ background: paymentTheme.bg, color: paymentTheme.color, border: `1px solid ${paymentTheme.color}33`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{sale.paymentType}</span>
        </div>
        <div className="rounded-2xl px-5 py-4 flex flex-col gap-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between gap-4"><div><p className="label-base mb-1">Amount</p><p className="font-display font-bold" style={{ fontSize: '1.75rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{fmt(sale.amount)}</p></div><RecordSyncBadge syncStatus={sale.syncStatus} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}><p className="label-base mb-1">Sold at</p><p className="font-body text-sm" style={{ color: '#f5ede0' }}>{new Date(sale.soldAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}><p className="label-base mb-1">Recorded</p><p className="font-body text-sm" style={{ color: '#f5ede0' }}>{new Date(sale.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
          </div>
          {sale.debtorId && <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)' }}><p className="label-base mb-1">Debt sale</p><p className="font-body text-sm" style={{ color: '#f5ede0' }}>This sale is linked to a debtor record and should stay visible in your debt collection workflow.</p></div>}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            className="btn-ghost"
            disabled={receiptBusy}
            onClick={() => {
              printReceipt(receiptPayload)
            }}
          >
            Reprint / PDF
          </button>
          <button
            className="btn-ghost"
            disabled={receiptBusy}
            onClick={async () => {
              setReceiptBusy(true)
              try {
                const text = buildReceiptText(receiptPayload)
                if (navigator.share) {
                  await navigator.share({
                    title: `Receipt ${receiptPayload.receiptNumber}`,
                    text,
                  })
                } else {
                  await navigator.clipboard.writeText(text)
                  window.alert('Receipt copied. You can paste and send it via WhatsApp or SMS.')
                }
              } finally {
                setReceiptBusy(false)
              }
            }}
          >
            Share
          </button>
          <button
            className="btn-ghost"
            disabled={receiptBusy}
            onClick={async () => {
              setReceiptBusy(true)
              try {
                await navigator.clipboard.writeText(buildReceiptText(receiptPayload))
                window.alert('Receipt copied to clipboard.')
              } finally {
                setReceiptBusy(false)
              }
            }}
          >
            Copy Text
          </button>
        </div>
        <button onClick={onClose} className="btn-primary">Close</button>
      </div>
    </div>
  )
}

const getRangeBounds = (range: HistoryRange, anchor: Date) => {
  const now = anchor
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (range) {
    case 'TODAY':
      return { from: startOfToday.toISOString(), to: now.toISOString() }
    case 'YESTERDAY': {
      const startOfYesterday = new Date(startOfToday)
      startOfYesterday.setDate(startOfYesterday.getDate() - 1)
      return { from: startOfYesterday.toISOString(), to: startOfToday.toISOString() }
    }
    case 'LAST_7_DAYS': {
      const startOfWindow = new Date(startOfToday)
      startOfWindow.setDate(startOfWindow.getDate() - 6)
      return { from: startOfWindow.toISOString(), to: now.toISOString() }
    }
    default:
      return {}
  }
}

export const SalesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleDTO | null>(null)
  const retrySalesSync = useRetrySalesSync()
  const initialRange = searchParams.get('range') as HistoryRange | null
  const [historyRange, setHistoryRange] = useState<HistoryRange>(initialRange && initialRange in HISTORY_LABELS ? initialRange : 'TODAY')
  const [rangeAnchor, setRangeAnchor] = useState(() => new Date())
  const rangeBounds = getRangeBounds(historyRange, rangeAnchor)
  const selectedRangeLabel = HISTORY_LABELS[historyRange].toLowerCase()

  useEffect(() => { setRangeAnchor(new Date()) }, [historyRange])

  const { data, fetchNextPage, hasNextPage, isLoading } = useSalesList({ paymentType: filter === 'ALL' ? undefined : filter, ...rangeBounds })
  const allSales = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden px-5 pt-12 pb-6" style={{ background: 'linear-gradient(180deg, rgba(45,58,124,0.18) 0%, transparent 100%)' }}>
        <div className="relative z-10 flex items-center justify-between max-w-6xl mx-auto">
          <div><p className="label-base mb-0.5">Overview</p><h1 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Sales history</h1></div>
          <button onClick={() => setWizardOpen(true)} className="rounded-xl flex items-center justify-center font-ui font-bold text-sm gap-1.5 px-4 py-2.5" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ New</button>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 max-w-6xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>{(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'ALL_TIME'] as HistoryRange[]).map((range) => <button key={range} onClick={() => { setHistoryRange(range); setSearchParams(range === 'TODAY' ? {} : { range }) }} className="rounded-full px-4 py-2 font-ui font-bold text-xs flex-shrink-0 transition-all duration-150" style={{ background: historyRange === range ? 'linear-gradient(135deg, #2d3a7c, #7585c8)' : 'rgba(255,255,255,0.05)', color: historyRange === range ? '#fff' : 'rgba(245,237,224,0.5)', border: `1px solid ${historyRange === range ? 'transparent' : 'rgba(255,255,255,0.07)'}`, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.65rem' }}>{HISTORY_LABELS[range]}</button>)}</div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>{(['ALL', 'CASH', 'TRANSFER', 'DEBT'] as FilterType[]).map((f) => <button key={f} onClick={() => setFilter(f)} className="rounded-full px-4 py-2 font-ui font-bold text-xs flex-shrink-0 transition-all duration-150" style={{ background: filter === f ? 'linear-gradient(135deg, #c04818, #e8a838)' : 'rgba(255,255,255,0.05)', color: filter === f ? '#fff' : 'rgba(245,237,224,0.5)', border: `1px solid ${filter === f ? 'transparent' : 'rgba(255,255,255,0.07)'}`, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem' }}>{f === 'ALL' ? 'All sales' : f.charAt(0) + f.slice(1).toLowerCase()}</button>)}</div>

        {isLoading ? (
          <div className="flex flex-col gap-2.5">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="rounded-xl h-16 skeleton" />)}</div>
        ) : allSales.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center"><span style={{ fontSize: '2rem' }}>Sales</span><p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{historyRange === 'ALL_TIME' ? 'No sales yet' : `No sales in ${selectedRangeLabel}`}</p><p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>{historyRange === 'ALL_TIME' ? 'Tap "+ New" to record your first sale' : 'Try another time range or record a new sale'}</p></div>
        ) : (
          <div className="flex flex-col gap-2">
            {allSales.map((sale, idx) => {
              const pt = PAYMENT_COLORS[sale.paymentType] ?? PAYMENT_COLORS.CASH
              return <div key={sale.id} onClick={() => setSelectedSale(sale)} className="flex items-center gap-4 rounded-xl px-4 py-3.5" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.05)', animation: `fade-in 0.3s ease ${idx * 0.04}s both`, cursor: 'pointer' }}><div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: pt.color }} /><div className="flex-1 min-w-0"><p className="font-ui font-semibold text-sm truncate" style={{ color: '#f5ede0' }}>{sale.itemName}</p><p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>{new Date(sale.soldAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div><div className="flex flex-col items-end gap-1 flex-shrink-0"><p className="font-display font-bold" style={{ fontSize: '1rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{fmt(sale.amount)}</p><span className="rounded-full px-2 py-0.5 font-ui font-bold" style={{ fontSize: '0.58rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: pt.color, background: pt.bg }}>{sale.paymentType}</span><RecordSyncBadge syncStatus={sale.syncStatus} onRetry={sale.syncStatus === 'FAILED' ? () => retrySalesSync.mutate() : undefined} /></div></div>
            })}
            {hasNextPage && <button onClick={() => fetchNextPage()} className="w-full py-3.5 rounded-xl font-ui font-semibold text-sm transition-opacity duration-150" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(245,237,224,0.5)' }}>Load more</button>}
          </div>
        )}
      </div>

      {wizardOpen && <RecordSaleWizard onClose={() => setWizardOpen(false)} />}
      {selectedSale && <SalesDetailSheet sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </div>
  )
}

