import { useState } from 'react'
import { useCreateSalesperson, useSalespeople } from '@/hooks/useTeam'
import { useAuthStore } from '@/stores/authStore'

export const TeamPage = () => {
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
  const { data: salespeople = [], isLoading } = useSalespeople()
  const createSalesperson = useCreateSalesperson()

  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim() || !phoneNumber.trim() || pin.trim().length !== 4) {
      setError('Enter name, phone number, and a 4-digit PIN.')
      return
    }

    setError('')
    createSalesperson.mutate(
      {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        pin: pin.trim(),
      },
      {
        onSuccess: () => {
          setName('')
          setPhoneNumber('')
          setPin('')
        },
        onError: (err: any) => {
          setError(err?.response?.data?.error?.message ?? 'Could not add salesperson')
        },
      }
    )
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen px-5 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#231510] px-5 py-6">
          <p className="font-ui text-sm font-bold text-[#f0bc5a]">Team Access</p>
          <p className="mt-2 font-body text-sm text-secondary">
            Only business owners can manage team members.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div>
          <p className="label-base mb-1">Business Team</p>
          <h1 className="font-display text-3xl font-bold text-primary wonky">Salespeople</h1>
          <p className="mt-2 font-body text-sm text-secondary">
            Add one or more salespeople to this business. Salespeople can record sales but cannot edit stock.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <p className="font-ui text-xs font-bold uppercase tracking-[0.1em] text-secondary">Add Salesperson</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input-base"
              placeholder="Full name"
            />
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="input-base"
              placeholder="Phone number"
            />
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="input-base"
              placeholder="4-digit PIN"
              inputMode="numeric"
              maxLength={4}
            />
          </div>
          {error ? <p className="mt-2 text-xs text-[#f87171]">{error}</p> : null}
          <button onClick={submit} className="btn-primary mt-4" disabled={createSalesperson.isPending}>
            {createSalesperson.isPending ? 'Adding...' : 'Add salesperson'}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <p className="font-ui text-xs font-bold uppercase tracking-[0.1em] text-secondary">Team Members</p>
          {isLoading ? (
            <div className="mt-3 flex flex-col gap-2">
              <div className="h-14 rounded-xl skeleton" />
              <div className="h-14 rounded-xl skeleton" />
            </div>
          ) : salespeople.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No salespeople yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {salespeople.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#2a1912] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-ui text-sm font-bold text-primary">{person.name}</p>
                    <p className="truncate text-xs text-secondary">{person.phoneNumber}</p>
                  </div>
                  <span className="rounded-full border border-[#4ecca3]/30 bg-[#4ecca3]/10 px-2.5 py-1 text-[10px] font-ui font-bold uppercase tracking-[0.08em] text-[#4ecca3]">
                    Salesperson
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
