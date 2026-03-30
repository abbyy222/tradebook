import { useState } from 'react'
import { RecordSyncBadge } from '@/components/RecordSyncBadge'
import { useDebtorsList, useCreateDebtor, useRecordPayment, useRetryDebtorSync } from '@/hooks/useDebtors'

const fmt = (n: number) => 'N' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })
type DebtorTab = 'OWING' | 'CLEARED' | 'ALL'

const AddDebtorSheet = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const createDebtor = useCreateDebtor()

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
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
          onClick={() => createDebtor.mutate({ customerName: name.trim(), phoneNumber: phone || undefined, totalOwed: parseFloat(amount), dueDate: dueDate || undefined } as any, { onSuccess: onClose })}
          disabled={!name.trim() || !amount || createDebtor.isPending}
          className="btn-primary mt-2"
        >
          {createDebtor.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Add debtor'}
        </button>
      </div>
    </div>
  )
}

const PaymentSheet = ({ debtor, onClose }: { debtor: any; onClose: () => void }) => {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const recordPayment = useRecordPayment(debtor.id)

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Record payment</h2>
          <p className="font-body text-sm mt-1" style={{ color: 'rgba(245,237,224,0.4)' }}>
            {debtor.customerName} owes <span style={{ color: '#f87171' }}>{fmt(debtor.balance)}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="label-base">Payment amount (N)</label>
          <input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base" style={{ fontFamily: "'Fraunces', serif", fontSize: '1.25rem', fontVariationSettings: "'WONK' 1" }} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="label-base">Note (optional)</label>
          <input type="text" placeholder="e.g. Part payment..." value={note} onChange={(e) => setNote(e.target.value)} className="input-base" />
        </div>
        <button
          onClick={() => recordPayment.mutate({ amount: parseFloat(amount), paidAt: new Date().toISOString(), note: note || undefined }, { onSuccess: onClose })}
          disabled={!amount || parseFloat(amount) <= 0 || recordPayment.isPending}
          className="btn-primary"
        >
          {recordPayment.isPending ? <span className="rounded-full border-2 border-white/30 border-t-white" style={{ width: 20, height: 20, animation: 'spin 0.7s linear infinite' }} /> : 'Record payment'}
        </button>
      </div>
    </div>
  )
}

export const DebtorsPage = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<DebtorTab>('OWING')
  const retryDebtorSync = useRetryDebtorSync()
  const { data, isLoading } = useDebtorsList()
  const debtors = data?.pages.flatMap((page) => page.data) ?? []

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

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden px-5 pt-12 pb-6" style={{ background: 'linear-gradient(180deg, rgba(226,75,74,0.1) 0%, transparent 100%)' }}>
        <div className="relative z-10 flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <p className="label-base mb-0.5">Manage</p>
            <h1 className="font-display font-bold" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Debtors</h1>
          </div>
          <button onClick={() => setAddOpen(true)} className="rounded-xl px-4 py-2.5 font-ui font-bold text-sm" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ Add</button>
        </div>
      </div>

      <div className="px-5 max-w-6xl mx-auto flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {([
            ['OWING', 'Owing'],
            ['CLEARED', 'Cleared'],
            ['ALL', 'All'],
          ] as [DebtorTab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="rounded-full px-4 py-2 font-ui font-bold text-xs flex-shrink-0 transition-all duration-150" style={{ background: activeTab === tab ? 'linear-gradient(135deg, #c04818, #e8a838)' : 'rgba(255,255,255,0.05)', color: activeTab === tab ? '#fff' : 'rgba(245,237,224,0.5)', border: `1px solid ${activeTab === tab ? 'transparent' : 'rgba(255,255,255,0.07)'}`, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {label} ({tabCounts[tab]})
            </button>
          ))}
        </div>

        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl skeleton" />)
        ) : filteredDebtors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span style={{ fontSize: '2rem' }}>People</span>
            <p className="font-display font-bold text-lg" style={{ color: '#f5ede0', fontVariationSettings: "'WONK' 1" }}>{activeTab === 'OWING' ? 'Nobody owes you right now' : activeTab === 'CLEARED' ? 'No cleared debtors yet' : 'No debtors'}</p>
            <p className="font-body text-sm" style={{ color: 'rgba(245,237,224,0.35)' }}>{activeTab === 'OWING' ? 'Everyone has paid. Well done!' : activeTab === 'CLEARED' ? 'Cleared records stay here for history and audits.' : 'Add your first debtor to start tracking balances.'}</p>
          </div>
        ) : filteredDebtors.map((debtor: any) => (
          <div key={debtor.id} className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#231510', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="rounded-full flex items-center justify-center font-ui font-bold text-sm flex-shrink-0" style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(192,72,24,0.35), rgba(45,58,124,0.35))', color: '#f0bc5a', border: '1px solid rgba(232,168,56,0.2)' }}>{debtor.customerName[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-ui font-semibold text-sm" style={{ color: '#f5ede0' }}>{debtor.customerName}</p>
                {debtor.balance === 0 && <span className="inline-flex rounded-full px-2.5 py-1 font-ui font-bold text-[10px]" style={{ background: 'rgba(78,204,163,0.12)', color: '#4ecca3', border: '1px solid rgba(78,204,163,0.2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cleared</span>}
              </div>
              {debtor.phoneNumber && <p className="font-body text-xs mt-0.5" style={{ color: 'rgba(245,237,224,0.3)' }}>{debtor.phoneNumber}</p>}
              {debtor.dueDate && <p className="font-body text-xs" style={{ color: '#f0bc5a' }}>Due {new Date(debtor.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <p className="font-display font-bold" style={{ fontSize: '1rem', color: debtor.balance === 0 ? '#4ecca3' : '#f87171', fontVariationSettings: "'WONK' 1" }}>{fmt(debtor.balance)}</p>
              <RecordSyncBadge syncStatus={debtor.syncStatus} onRetry={debtor.syncStatus === 'FAILED' ? () => retryDebtorSync.mutate() : undefined} />
              {debtor.balance > 0 && <button onClick={() => setSelectedDebtor(debtor)} className="rounded-full px-3 py-1 font-ui font-bold text-xs" style={{ background: 'rgba(78,204,163,0.12)', color: '#4ecca3', border: '1px solid rgba(78,204,163,0.2)' }}>Pay</button>}
            </div>
          </div>
        ))}
      </div>

      {addOpen && <AddDebtorSheet onClose={() => setAddOpen(false)} />}
      {selectedDebtor && <PaymentSheet debtor={selectedDebtor} onClose={() => setSelectedDebtor(null)} />}
    </div>
  )
}

