import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCreateSupplier, useDeleteSupplier, useSuppliersList } from '@/hooks/useSuppliers'

const AddSupplierSheet = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [note, setNote] = useState('')
  const createSupplier = useCreateSupplier()

  const submit = () => {
    createSupplier.mutate({
      name: name.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      itemCategory: itemCategory.trim() || undefined,
      note: note.trim() || undefined,
    }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl px-6 pt-5 flex flex-col gap-5 animate-slide-up" style={{ background: '#1e1208', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="rounded-full mx-auto mb-1" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <h2 className="font-display font-bold" style={{ fontSize: '1.5rem', color: '#f5ede0', fontVariationSettings: "'WONK' 1, 'opsz' 30" }}>Add supplier</h2>
        <input type="text" className="input-base" placeholder="Supplier name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="tel" className="input-base" placeholder="Phone number (optional)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <input type="text" className="input-base" placeholder="Item category (optional)" value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} />
        <input type="text" className="input-base" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn-primary" disabled={!name.trim() || createSupplier.isPending} onClick={submit}>{createSupplier.isPending ? 'Saving...' : 'Add supplier'}</button>
      </div>
    </div>
  )
}

export const SuppliersPage = () => {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
  const { data, isLoading } = useSuppliersList(search || undefined)
  const deleteSupplier = useDeleteSupplier()

  const suppliers = data?.pages.flatMap((page) => page.data) ?? []
  const isOnline = navigator.onLine

  return (
    <div className="min-h-screen px-5 pb-8 pt-12 md:px-6 xl:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label-base mb-1">Directory</p>
            <h1 className="font-display text-3xl font-bold text-primary wonky">Suppliers</h1>
          </div>
          <button onClick={() => setAddOpen(true)} className="rounded-xl px-4 py-2.5 font-ui font-bold text-sm" style={{ background: 'linear-gradient(135deg, #2d3a7c, #7585c8)', color: '#fff' }}>+ Add</button>
        </div>

        <div className="mt-4">
          <input className="input-base" placeholder="Search supplier by name, phone, category" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-[#231510] overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3.5">
            <p className="font-ui text-sm font-bold text-primary">Supplier list</p>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              <div className="h-14 rounded-xl skeleton" />
              <div className="h-14 rounded-xl skeleton" />
            </div>
          ) : suppliers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-secondary">No suppliers yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-ui text-sm font-semibold text-primary">{supplier.name}</p>
                    <p className="truncate text-xs text-secondary">{supplier.phoneNumber || 'No phone'}{supplier.itemCategory ? ` - ${supplier.itemCategory}` : ''}{supplier.note ? ` - ${supplier.note}` : ''}</p>
                  </div>
                  {isOwner ? (
                    <button
                      className="rounded-full px-3 py-1 font-ui font-bold text-xs"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                      onClick={() => deleteSupplier.mutate(supplier.id)}
                      disabled={deleteSupplier.isPending || !isOnline}
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

      {addOpen ? <AddSupplierSheet onClose={() => setAddOpen(false)} /> : null}
    </div>
  )
}
