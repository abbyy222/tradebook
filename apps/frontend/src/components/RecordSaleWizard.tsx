import { useMemo, useState } from 'react'
import { useCreateSale } from '@/hooks/useSales'
import { useCreateDebtor, useDebtorsList } from '@/hooks/useDebtors'
import { useCustomersList } from '@/hooks/useCustomers'
import { useStockList } from '@/hooks/useStock'
import { useAuthStore } from '@/stores/authStore'
import { buildReceiptText, printReceipt } from '@/utils/receipt'

interface Props {
  onClose: () => void
}

type Step = 'item' | 'quantity' | 'payment' | 'confirm'
type PaymentType = 'CASH' | 'TRANSFER' | 'DEBT'
type CreditSource = 'DEBTORS' | 'CUSTOMERS'

const STEPS: Step[] = ['item', 'quantity', 'payment', 'confirm']
const STEP_LABELS = ['Item', 'Quantity', 'Payment', 'Confirm']
const QUICK_QUANTITIES = [1, 2, 3, 5, 10]

const fmt = (n: number) => '?' + n.toLocaleString('en-NG')

const PAYMENT_OPTIONS = [
  { type: 'CASH' as const, label: 'Cash', desc: 'Paid in hand', emoji: '??', color: '#4ecca3', bg: 'rgba(78,204,163,0.1)' },
  { type: 'TRANSFER' as const, label: 'Transfer', desc: 'Bank or mobile money', emoji: '??', color: '#7585c8', bg: 'rgba(117,133,200,0.1)' },
  { type: 'DEBT' as const, label: 'Credit', desc: 'They owe you', emoji: '??', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
]

const ProgressBar = ({ current }: { current: number }) => (
  <div className="flex items-center gap-1.5 mb-8">
    {STEPS.map((_, i) => {
      const isDone = i < current
      const isActive = i === current
      return (
        <div key={i} className="flex items-center gap-1.5 flex-1">
          <div
            className="flex-1 rounded-full transition-all duration-300"
            style={{
              height: 3,
              background: isDone ? 'linear-gradient(90deg, #c04818, #e8a838)' : isActive ? '#c4622d' : 'rgba(255,255,255,0.1)',
            }}
          />
          {i < STEPS.length - 1 && <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: isDone ? '#e8a838' : isActive ? '#c4622d' : 'rgba(255,255,255,0.12)' }} />}
        </div>
      )
    })}
  </div>
)

export const RecordSaleWizard = ({ onClose }: Props) => {
  const [step, setStep] = useState<Step>('item')
  const [selectedStockItemId, setSelectedStockItemId] = useState('')
  const [search, setSearch] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH')
  const [selectedDebtorId, setSelectedDebtorId] = useState('')
  const [creditSource, setCreditSource] = useState<CreditSource>('DEBTORS')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [debtorSearch, setDebtorSearch] = useState('')
  const [showCreateDebtor, setShowCreateDebtor] = useState(false)
  const [newDebtorName, setNewDebtorName] = useState('')
  const [newDebtorPhone, setNewDebtorPhone] = useState('')
  const [newDebtorDueDate, setNewDebtorDueDate] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [completedSaleId, setCompletedSaleId] = useState('')
  const [completedSaleTime, setCompletedSaleTime] = useState('')
  const [receiptBusy, setReceiptBusy] = useState(false)

  const createSale = useCreateSale()
  const createDebtor = useCreateDebtor()
  const trader = useAuthStore((state) => state.trader)
  const { data: stockData } = useStockList({ search })
  const { data: debtorsData } = useDebtorsList()
  const { data: customersData } = useCustomersList(debtorSearch || undefined)

  const stockItems = stockData?.pages.flatMap((page) => page.data) ?? []
  const selectedStockItem = stockItems.find((item) => item.id === selectedStockItemId)
  const debtors = debtorsData?.pages.flatMap((page) => page.data) ?? []
  const customers = customersData?.pages.flatMap((page) => page.data) ?? []
  const selectableDebtors = debtors
  const filteredDebtors = useMemo(() => {
    const term = debtorSearch.trim().toLowerCase()
    if (!term) return selectableDebtors
    return selectableDebtors.filter((debtor) => {
      return (
        debtor.customerName.toLowerCase().includes(term) ||
        debtor.phoneNumber?.toLowerCase().includes(term)
      )
    })
  }, [debtorSearch, selectableDebtors])
  const filteredCustomers = useMemo(() => {
    const term = debtorSearch.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.phoneNumber?.toLowerCase().includes(term)
      )
    })
  }, [customers, debtorSearch])
  const selectedDebtor = selectableDebtors.find((debtor) => debtor.id === selectedDebtorId)

  const qty = Number.parseInt(quantity, 10) || 0
  const amount = selectedStockItem ? Number((selectedStockItem.unitPrice * qty).toFixed(2)) : 0
  const receiptPayload = success && selectedStockItem
    ? {
        receiptNumber: completedSaleId ? completedSaleId.slice(0, 8).toUpperCase() : 'SALE',
        businessName: trader?.businessName ?? trader?.name ?? 'Tradebook',
        traderName: trader?.name,
        phoneNumber: trader?.phoneNumber,
        soldAt: completedSaleTime || new Date().toISOString(),
        itemName: selectedStockItem.itemName,
        quantity: qty,
        unitPrice: selectedStockItem.unitPrice,
        amount,
        paymentType,
        debtorName: paymentType === 'DEBT' ? selectedDebtor?.customerName : undefined,
      }
    : null
  const stepIndex = STEPS.indexOf(step)
  const goNext = () => setStep(STEPS[stepIndex + 1])
  const goBack = () => (stepIndex === 0 ? onClose() : setStep(STEPS[stepIndex - 1]))

  const quantityError = useMemo(() => {
    if (!selectedStockItem) return 'Select an inventory item first.'
    if (!qty || qty <= 0) return 'Quantity sold must be at least 1.'
    if (qty > selectedStockItem.quantity) return 'Not enough stock. Available: ' + selectedStockItem.quantity
    return ''
  }, [qty, selectedStockItem])

  const handleQuickCreateDebtor = async () => {
    const name = newDebtorName.trim()
    const phone = newDebtorPhone.trim()
    if (!name) {
      setError('Enter customer name to add debtor')
      return
    }

    try {
      setError('')
      const createdDebtor = await createDebtor.mutateAsync({
        customerName: name,
        phoneNumber: phone || undefined,
        totalOwed: 0,
        dueDate: newDebtorDueDate || undefined,
      })
      setSelectedDebtorId(createdDebtor.id)
      setDebtorSearch(name)
      setShowCreateDebtor(false)
      setNewDebtorName('')
      setNewDebtorPhone('')
      setNewDebtorDueDate('')
    } catch {
      setError('Unable to add debtor right now')
    }
  }

  const normalizePhone = (value?: string | null) => {
    if (!value) return ''
    return value.replace(/\D/g, '')
  }

  const handleSelectCustomerForCredit = async (customer: { id: string; name: string; phoneNumber?: string }) => {
    setError('')
    setSelectedCustomerId(customer.id)

    const customerPhone = normalizePhone(customer.phoneNumber)
    const existingDebtor = selectableDebtors.find((debtor) => {
      const debtorPhone = normalizePhone(debtor.phoneNumber)
      if (customerPhone && debtorPhone && customerPhone === debtorPhone) return true
      return debtor.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()
    })

    if (existingDebtor) {
      setSelectedDebtorId(existingDebtor.id)
      return
    }

    try {
      const createdDebtor = await createDebtor.mutateAsync({
        customerName: customer.name,
        phoneNumber: customer.phoneNumber || undefined,
        totalOwed: 0,
      })
      setSelectedDebtorId(createdDebtor.id)
    } catch {
      setError('Could not link this customer to credit right now')
    }
  }

  const handleConfirm = async () => {
    if (!selectedStockItem || quantityError) {
      setError(quantityError || 'Select a valid stock item')
      return
    }

    try {
      setError('')
      const createdSale = await createSale.mutateAsync({
        stockItemId: selectedStockItem.id,
        itemName: selectedStockItem.itemName,
        quantity: qty,
        unitPrice: selectedStockItem.unitPrice,
        amount,
        paymentType,
        debtorId: paymentType === 'DEBT' ? selectedDebtorId : undefined,
        soldAt: new Date().toISOString(),
      })
      setCompletedSaleId(createdSale.id)
      setCompletedSaleTime(createdSale.soldAt)
      setSuccess(true)
      setTimeout(onClose, 2200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record sale')
    }
  }

  if (success && selectedStockItem) {
    return (
      <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
        <div className="w-full max-w-lg mx-auto rounded-t-3xl px-8 py-12 flex flex-col items-center gap-5 animate-slide-up" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
          <div className="rounded-full flex items-center justify-center" style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #c04818, #e8a838)', boxShadow: '0 0 0 12px rgba(196,98,45,0.12), 0 0 0 24px rgba(196,98,45,0.06)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="text-center">
            <h2 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Sale recorded!</h2>
            <p className="font-body text-sm mt-1.5" style={{ color: 'rgba(245,237,224,0.4)' }}>{navigator.onLine ? 'Saved and synced to the cloud' : 'Saved locally - will sync when online'}</p>
          </div>
          <div className="w-full rounded-xl px-5 py-4 flex items-center justify-between" style={{ background: '#2e1c14', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.6)' }}>{selectedStockItem.itemName} x {qty}</span>
            <span className="font-display font-bold" style={{ fontSize: '1.1rem', color: '#e8a838', fontVariationSettings: "'WONK' 1" }}>{fmt(amount)}</span>
          </div>

          <div className="w-full grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              className="btn-ghost"
              disabled={!receiptPayload || receiptBusy}
              onClick={() => {
                if (!receiptPayload) return
                printReceipt(receiptPayload)
              }}
            >
              Print / PDF
            </button>
            <button
              className="btn-ghost"
              disabled={!receiptPayload || receiptBusy}
              onClick={async () => {
                if (!receiptPayload) return
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
              disabled={!receiptPayload || receiptBusy}
              onClick={async () => {
                if (!receiptPayload) return
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
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-5" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-center justify-between mb-4">
          <p className="font-ui font-bold uppercase text-xs tracking-widest" style={{ color: 'rgba(245,237,224,0.35)' }}>Step {stepIndex + 1} of {STEPS.length} - {STEP_LABELS[stepIndex]}</p>
          <button onClick={onClose} className="rounded-full flex items-center justify-center transition-opacity duration-150 hover:opacity-60" style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.07)', color: 'rgba(245,237,224,0.5)', fontSize: '1rem' }}>×</button>
        </div>

        <ProgressBar current={stepIndex} />

        {step === 'item' && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display font-bold" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Choose from inventory</h2>
            <input type="text" autoFocus placeholder="Search stock item" value={search} onChange={(e) => setSearch(e.target.value)} className="input-base text-lg" style={{ fontSize: '1.05rem', padding: '1rem 1.25rem' }} />
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {stockItems.length === 0 ? (
                <div className="rounded-xl px-4 py-4 font-body text-sm" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(245,237,224,0.5)' }}>No stock items found. Add the item to inventory first before recording a sale.</div>
              ) : (
                stockItems.map((item) => {
                  const isSelected = item.id === selectedStockItemId
                  const soldOut = item.quantity <= 0
                  return (
                    <button key={item.id} disabled={soldOut} onClick={() => setSelectedStockItemId(item.id)} className="flex items-center justify-between gap-4 rounded-xl p-4 w-full text-left transition-all duration-150" style={{ background: isSelected ? 'rgba(232,168,56,0.08)' : 'rgba(255,255,255,0.03)', border: isSelected ? '1.5px solid rgba(232,168,56,0.35)' : '1.5px solid rgba(255,255,255,0.07)', opacity: soldOut ? 0.5 : 1 }}>
                      <div>
                        <p className="font-ui font-bold text-sm" style={{ color: '#f5ede0' }}>{item.itemName}</p>
                        <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>{fmt(item.unitPrice)} each</p>
                      </div>
                      <span className="rounded-full px-2.5 py-1 font-ui font-bold text-[11px]" style={{ background: soldOut ? 'rgba(248,113,113,0.12)' : 'rgba(78,204,163,0.12)', color: soldOut ? '#f87171' : '#4ecca3' }}>{soldOut ? 'Out of stock' : item.quantity + ' left'}</span>
                    </button>
                  )
                })
              )}
            </div>
            <button className="btn-primary" disabled={!selectedStockItem} onClick={goNext}>Next ?</button>
          </div>
        )}

        {step === 'quantity' && selectedStockItem && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display font-bold" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>How many did you sell?</h2>
            <div className="rounded-2xl px-5 py-4" style={{ background: '#2e1c14', border: '1.5px solid rgba(255,255,255,0.08)' }}>
              <p className="label-base mb-2">{selectedStockItem.itemName}</p>
              <p className="font-body text-sm mb-4" style={{ color: 'rgba(245,237,224,0.45)' }}>Selling price is fixed at {fmt(selectedStockItem.unitPrice)}. Available stock: {selectedStockItem.quantity}</p>
              <input type="number" inputMode="numeric" autoFocus min="1" max={selectedStockItem.quantity} placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input-base" style={{ fontSize: '1.6rem', padding: '1rem 1.25rem' }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUANTITIES.map((quickQty) => (
                <button key={quickQty} onClick={() => setQuantity(String(quickQty))} disabled={quickQty > selectedStockItem.quantity} className="rounded-full px-4 py-2 font-ui font-semibold text-xs transition-all duration-150 active:scale-95" style={{ background: quantity === String(quickQty) ? 'rgba(232,168,56,0.18)' : 'rgba(255,255,255,0.05)', border: quantity === String(quickQty) ? '1px solid rgba(232,168,56,0.4)' : '1px solid rgba(255,255,255,0.08)', color: quantity === String(quickQty) ? '#f0bc5a' : 'rgba(245,237,224,0.5)', opacity: quickQty > selectedStockItem.quantity ? 0.35 : 1 }}>
                  {quickQty}
                </button>
              ))}
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="label-base mb-1">Total sale</p>
              <p className="font-display font-bold" style={{ color: '#e8a838', fontSize: '1.4rem', fontVariationSettings: "'WONK' 1" }}>{fmt(amount)}</p>
              {quantityError && <p className="font-body text-xs mt-2" style={{ color: '#f87171' }}>{quantityError}</p>}
            </div>
            <div className="flex gap-3"><button className="btn-ghost flex-shrink-0" onClick={goBack}>? Back</button><button className="btn-primary flex-1" disabled={Boolean(quantityError)} onClick={goNext}>Next ?</button></div>
          </div>
        )}

        {step === 'payment' && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display font-bold" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>How did they pay?</h2>
            <div className="flex flex-col gap-2.5">
              {PAYMENT_OPTIONS.map((option) => {
                const isSelected = paymentType === option.type
                return (
                  <button key={option.type} onClick={() => { setPaymentType(option.type); if (option.type !== 'DEBT') { setSelectedDebtorId(''); setSelectedCustomerId('') } }} className="flex items-center gap-4 rounded-xl p-4 w-full text-left transition-all duration-150 active:scale-98" style={{ background: isSelected ? option.bg : 'rgba(255,255,255,0.03)', border: isSelected ? '1.5px solid ' + option.color + '55' : '1.5px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{option.emoji}</span>
                    <div className="flex-1"><p className="font-ui font-bold text-sm" style={{ color: isSelected ? option.color : '#f5ede0' }}>{option.label}</p><p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>{option.desc}</p></div>
                  </button>
                )
              })}
            </div>
            {paymentType === 'DEBT' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-ui font-bold text-xs uppercase tracking-wider" style={{ color: 'rgba(245,237,224,0.4)' }}>Select debtor</p>
                  <button
                    type="button"
                    className="rounded-full px-3 py-1 font-ui font-bold text-[11px]"
                    style={{ background: 'rgba(232,168,56,0.15)', color: '#f0bc5a', border: '1px solid rgba(232,168,56,0.22)' }}
                    onClick={() => setShowCreateDebtor((prev) => !prev)}
                  >
                    {showCreateDebtor ? 'Cancel' : '+ New debtor'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['DEBTORS', 'CUSTOMERS'] as const).map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setCreditSource(source)}
                      className="rounded-xl px-3 py-2 font-ui font-bold text-xs transition-all duration-150"
                      style={{
                        background: creditSource === source ? 'rgba(117,133,200,0.18)' : 'rgba(255,255,255,0.03)',
                        color: creditSource === source ? '#9fb0ff' : 'rgba(245,237,224,0.55)',
                        border: `1px solid ${creditSource === source ? 'rgba(117,133,200,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      {source === 'DEBTORS' ? 'From debtors' : 'From customers'}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder={creditSource === 'DEBTORS' ? 'Search debtor name or phone' : 'Search customer name or phone'}
                  value={debtorSearch}
                  onChange={(e) => setDebtorSearch(e.target.value)}
                  className="input-base"
                />

                {showCreateDebtor ? (
                  <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input
                      type="text"
                      placeholder="Customer name"
                      value={newDebtorName}
                      onChange={(e) => setNewDebtorName(e.target.value)}
                      className="input-base"
                    />
                    <input
                      type="tel"
                      placeholder="Phone number (optional)"
                      value={newDebtorPhone}
                      onChange={(e) => setNewDebtorPhone(e.target.value)}
                      className="input-base"
                    />
                    <div className="flex flex-col gap-1">
                      <label className="label-base">First payment date (optional)</label>
                      <input
                        type="date"
                        value={newDebtorDueDate}
                        onChange={(e) => setNewDebtorDueDate(e.target.value)}
                        className="input-base"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void handleQuickCreateDebtor()}
                      disabled={createDebtor.isPending}
                    >
                      {createDebtor.isPending ? 'Adding...' : 'Add and select'}
                    </button>
                  </div>
                ) : null}

                {creditSource === 'DEBTORS' && filteredDebtors.length === 0 ? (
                  <div className="rounded-xl px-4 py-3 font-body text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: '#f5ede0' }}>No matching debtor. Tap New debtor to add this customer now.</div>
                ) : creditSource === 'CUSTOMERS' && filteredCustomers.length === 0 ? (
                  <div className="rounded-xl px-4 py-3 font-body text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: '#f5ede0' }}>No matching customer. Add customer from More {'>'} Customers.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {creditSource === 'DEBTORS'
                      ? filteredDebtors.map((debtor) => {
                          const isSelected = selectedDebtorId === debtor.id
                          return (
                            <button key={debtor.id} onClick={() => { setSelectedDebtorId(debtor.id); setSelectedCustomerId('') }} className="w-full rounded-xl px-4 py-3 text-left transition-all duration-150" style={{ background: isSelected ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)', border: isSelected ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center justify-between gap-3"><span className="font-ui font-bold text-sm" style={{ color: '#f5ede0' }}>{debtor.customerName}</span><span className="font-body text-xs" style={{ color: debtor.balance > 0 ? '#f87171' : '#4ecca3' }}>{debtor.balance > 0 ? `Owes ${fmt(debtor.balance)}` : 'Cleared'}</span></div>
                            </button>
                          )
                        })
                      : filteredCustomers.map((customer) => {
                          const isSelected = selectedCustomerId === customer.id
                          return (
                            <button key={customer.id} onClick={() => void handleSelectCustomerForCredit(customer)} className="w-full rounded-xl px-4 py-3 text-left transition-all duration-150" style={{ background: isSelected ? 'rgba(117,133,200,0.15)' : 'rgba(255,255,255,0.03)', border: isSelected ? '1px solid rgba(117,133,200,0.35)' : '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center justify-between gap-3"><span className="font-ui font-bold text-sm" style={{ color: '#f5ede0' }}>{customer.name}</span><span className="font-body text-xs" style={{ color: '#9fb0ff' }}>Use as credit</span></div>
                              {customer.phoneNumber ? <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.35)' }}>{customer.phoneNumber}</p> : null}
                            </button>
                          )
                        })}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3"><button className="btn-ghost flex-shrink-0" onClick={goBack}>? Back</button><button className="btn-primary flex-1" onClick={goNext} disabled={paymentType === 'DEBT' && !selectedDebtorId}>Review ?</button></div>
          </div>
        )}

        {step === 'confirm' && selectedStockItem && (
          <div className="flex flex-col gap-5">
            <h2 className="font-display font-bold" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Confirm sale</h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#2e1c14' }}>
              {[
                { label: 'Item', value: selectedStockItem.itemName },
                { label: 'Qty', value: String(qty) },
                { label: 'Unit price', value: fmt(selectedStockItem.unitPrice) },
                { label: 'Amount', value: fmt(amount), isAmount: true },
                { label: 'Payment', value: PAYMENT_OPTIONS.find((option) => option.type === paymentType)?.label ?? paymentType, color: PAYMENT_OPTIONS.find((option) => option.type === paymentType)?.color },
                ...(paymentType === 'DEBT' && selectedDebtor ? [{ label: 'Debtor', value: selectedDebtor.customerName }] : []),
              ].map((row, index, rows) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: index < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <p className="font-ui font-semibold uppercase text-xs tracking-wider" style={{ color: 'rgba(245,237,224,0.35)' }}>{row.label}</p>
                  <p className={row.isAmount ? 'font-display font-bold' : 'font-ui font-semibold text-sm'} style={{ color: row.color ?? (row.isAmount ? '#e8a838' : '#f5ede0'), fontSize: row.isAmount ? '1.25rem' : undefined, fontVariationSettings: row.isAmount ? "'WONK' 1" : undefined }}>{row.value}</p>
                </div>
              ))}
            </div>
            {error && <p className="font-body text-sm" style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex gap-3"><button className="btn-ghost flex-shrink-0" onClick={goBack}>? Back</button><button className="btn-primary flex-1" disabled={createSale.isPending || Boolean(quantityError) || (paymentType === 'DEBT' && !selectedDebtorId)} onClick={handleConfirm}>{createSale.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : '? Record sale'}</button></div>
            <p className="text-center font-body text-xs" style={{ color: 'rgba(245,237,224,0.25)' }}>{navigator.onLine ? 'Will save and sync immediately' : 'Will save offline and sync when you are online'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
