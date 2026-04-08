import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCreateCustomer, useCustomersList, useDeleteCustomer } from '@/hooks/useCustomers'

const AddCustomerSheet = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [note, setNote] = useState('')
  const createCustomer = useCreateCustomer()

  const submit = () => {
    createCustomer.mutate({
      name: name.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      note: note.trim() || undefined,
    }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Add customer</h2>
        <input type="text" className="input-base" placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="tel" className="input-base" placeholder="Phone number (optional)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <input type="text" className="input-base" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn-primary" disabled={!name.trim() || createCustomer.isPending} onClick={submit}>{createCustomer.isPending ? 'Saving...' : 'Add customer'}</button>
      </div>
    </div>
  )
}

export const CustomersPage = () => {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
  const { data, isLoading } = useCustomersList(search || undefined)
  const deleteCustomer = useDeleteCustomer()

  const customers = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="min-h-screen px-5 pb-8 pt-12 md:px-6 xl:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label-base mb-1">Directory</p>
            <h1 className="font-display text-3xl font-bold text-primary wonky">Customers</h1>
          </div>
          <button onClick={() => setAddOpen(true)} className="rounded-xl px-4 py-2.5 font-ui font-bold text-sm" style={{ background: 'linear-gradient(135deg, #c04818, #e8a838)', color: '#fff' }}>+ Add</button>
        </div>

        <div className="mt-4">
          <input className="input-base" placeholder="Search customer by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-[#231510] overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3.5">
            <p className="font-ui text-sm font-bold text-primary">Customer list</p>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              <div className="h-14 rounded-xl skeleton" />
              <div className="h-14 rounded-xl skeleton" />
            </div>
          ) : customers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-secondary">No customers yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {customers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-ui text-sm font-semibold text-primary">{customer.name}</p>
                    <p className="truncate text-xs text-secondary">{customer.phoneNumber || 'No phone'}{customer.note ? ` - ${customer.note}` : ''}</p>
                  </div>
                  {isOwner ? (
                    <button
                      className="rounded-full px-3 py-1 font-ui font-bold text-xs"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                      onClick={() => deleteCustomer.mutate(customer.id)}
                      disabled={deleteCustomer.isPending}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addOpen ? <AddCustomerSheet onClose={() => setAddOpen(false)} /> : null}
    </div>
  )
}
