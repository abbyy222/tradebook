import { useMemo, useState } from 'react'
import {
  useCreateSalesperson,
  useDeleteSalesperson,
  useSalespeople,
  useUpdateSalesperson,
} from '@/hooks/useTeam'
import { useAuthStore } from '@/stores/authStore'
import type { TraderDTO } from '@tradebook/shared-types'

type TraderLanguage = 'EN' | 'PIDGIN' | 'IGBO' | 'YORUBA' | 'HAUSA'

const languageOptions: Array<{ value: TraderLanguage; label: string }> = [
  { value: 'EN', label: 'English' },
  { value: 'PIDGIN', label: 'Pidgin' },
  { value: 'YORUBA', label: 'Yoruba' },
  { value: 'IGBO', label: 'Igbo' },
  { value: 'HAUSA', label: 'Hausa' },
]

const SalespersonSheet = ({
  mode,
  salesperson,
  onClose,
}: {
  mode: 'create' | 'edit'
  salesperson?: TraderDTO | null
  onClose: () => void
}) => {
  const createSalesperson = useCreateSalesperson()
  const updateSalesperson = useUpdateSalesperson()
  const [name, setName] = useState(salesperson?.name ?? '')
  const [phoneNumber, setPhoneNumber] = useState(salesperson?.phoneNumber ?? '')
  const [language, setLanguage] = useState<TraderLanguage>((salesperson?.language as TraderLanguage | undefined) ?? 'EN')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const isEditing = mode === 'edit' && salesperson
  const isPending = createSalesperson.isPending || updateSalesperson.isPending

  const submit = () => {
    if (!name.trim() || !phoneNumber.trim()) {
      setError('Enter the salesperson name and phone number.')
      return
    }

    if (!isEditing && pin.trim().length !== 4) {
      setError('Set a 4-digit PIN for the salesperson.')
      return
    }

    if (pin.trim() && pin.trim().length !== 4) {
      setError('PIN must be exactly 4 digits.')
      return
    }

    setError('')

    if (isEditing && salesperson) {
      updateSalesperson.mutate(
        {
          salespersonId: salesperson.id,
          input: {
            name: name.trim(),
            phoneNumber: phoneNumber.trim(),
            language,
            ...(pin.trim() ? { pin: pin.trim() } : {}),
          },
        },
        {
          onSuccess: onClose,
          onError: (err: any) => {
            setError(err?.response?.data?.error?.message ?? 'Could not update salesperson')
          },
        },
      )
      return
    }

    createSalesperson.mutate(
      {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        pin: pin.trim(),
        language,
      },
      {
        onSuccess: onClose,
        onError: (err: any) => {
          setError(err?.response?.data?.error?.message ?? 'Could not add salesperson')
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end animate-fade-in"
      style={{ background: 'rgba(10,5,2,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[92vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-t-3xl px-4 pt-4 sm:px-6 sm:pt-5 animate-slide-up"
        style={{
          background: '#1e1208',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-1 rounded-full" style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-base mb-1">{isEditing ? 'Team update' : 'Business team'}</p>
            <h2
              className="font-display text-[1.5rem] font-bold text-primary wonky"
            >
              {isEditing ? 'Edit salesperson' : 'Add salesperson'}
            </h2>
            <p className="mt-2 font-body text-sm text-secondary">
              {isEditing
                ? 'Update profile details and reset the PIN only when you need to.'
                : 'Give a salesperson access to record sales under this business.'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost shrink-0">Close</button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-2">
            <label className="label-base">Full name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input-base"
              placeholder="Salesperson name"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-base">Phone number</label>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="input-base"
              placeholder="080..."
              inputMode="tel"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-base">Language</label>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as TraderLanguage)}
              className="input-base"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-base">{isEditing ? 'New 4-digit PIN (optional)' : '4-digit PIN'}</label>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="input-base"
              placeholder={isEditing ? 'Leave blank to keep current PIN' : '1234'}
              inputMode="numeric"
              maxLength={4}
            />
          </div>
        </div>

        {error ? <p className="text-xs text-[#f87171]">{error}</p> : null}

        <button onClick={submit} className="btn-primary" disabled={isPending}>
          {isPending ? (isEditing ? 'Saving...' : 'Adding...') : isEditing ? 'Save changes' : 'Add salesperson'}
        </button>
      </div>
    </div>
  )
}

export const TeamPage = () => {
  const trader = useAuthStore((state) => state.trader)
  const isOwner = trader?.role !== 'SALESPERSON'
  const { data: salespeople = [], isLoading } = useSalespeople()
  const deleteSalesperson = useDeleteSalesperson()
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | null>(null)
  const [selectedSalesperson, setSelectedSalesperson] = useState<TraderDTO | null>(null)
  const [error, setError] = useState('')

  const activeCount = useMemo(
    () => salespeople.filter((person) => person.isActive).length,
    [salespeople],
  )

  const openCreate = () => {
    setSelectedSalesperson(null)
    setSheetMode('create')
    setError('')
  }

  const openEdit = (salesperson: TraderDTO) => {
    setSelectedSalesperson(salesperson)
    setSheetMode('edit')
    setError('')
  }

  const closeSheet = () => {
    setSheetMode(null)
    setSelectedSalesperson(null)
  }

  const removeSalesperson = (salesperson: TraderDTO) => {
    const confirmed = window.confirm(
      `Remove ${salesperson.name} from the active team? Their past records will stay, but they will no longer be able to log in.`,
    )
    if (!confirmed) return

    setError('')
    deleteSalesperson.mutate(salesperson.id, {
      onError: (err: any) => {
        setError(err?.response?.data?.error?.message ?? 'Could not remove salesperson')
      },
    })
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-base mb-1">Business Team</p>
            <h1 className="font-display text-3xl font-bold text-primary wonky">Salespeople</h1>
            <p className="mt-2 font-body text-sm text-secondary">
              Manage who can sell for this business, update their profile, and remove access safely.
            </p>
          </div>
          <button onClick={openCreate} className="btn-primary">
            Add salesperson
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
            <p className="label-base mb-1">Active team</p>
            <p className="font-display text-2xl font-bold text-primary wonky">{activeCount}</p>
            <p className="mt-1 text-xs text-secondary">Salespeople who can log in right now.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
            <p className="label-base mb-1">Total profiles</p>
            <p className="font-display text-2xl font-bold text-primary wonky">{salespeople.length}</p>
            <p className="mt-1 text-xs text-secondary">Every salesperson profile created for this business.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
            <p className="label-base mb-1">Owner control</p>
            <p className="font-ui text-sm font-bold text-[#4ecca3]">Edit, reset PIN, remove access</p>
            <p className="mt-1 text-xs text-secondary">History stays intact even after a salesperson is removed.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#231510] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-ui text-xs font-bold uppercase tracking-[0.1em] text-secondary">Team Members</p>
            {error ? <p className="text-xs text-[#f87171]">{error}</p> : null}
          </div>

          {isLoading ? (
            <div className="mt-3 flex flex-col gap-2">
              <div className="h-20 rounded-xl skeleton" />
              <div className="h-20 rounded-xl skeleton" />
            </div>
          ) : salespeople.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No salespeople yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {salespeople.map((person) => (
                <div
                  key={person.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#2a1912] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-ui text-sm font-bold text-primary">{person.name}</p>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-ui font-bold uppercase tracking-[0.08em]"
                        style={{
                          background: person.isActive ? 'rgba(78,204,163,0.12)' : 'rgba(248,113,113,0.12)',
                          border: `1px solid ${person.isActive ? 'rgba(78,204,163,0.2)' : 'rgba(248,113,113,0.2)'}`,
                          color: person.isActive ? '#4ecca3' : '#f87171',
                        }}
                      >
                        {person.isActive ? 'Active' : 'Removed'}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-secondary">{person.phoneNumber}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {languageOptions.find((option) => option.value === person.language)?.label ?? person.language}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openEdit(person)} className="btn-ghost">
                      Edit
                    </button>
                    {person.isActive ? (
                      <button
                        onClick={() => removeSalesperson(person)}
                        className="rounded-xl border border-[#f87171]/25 bg-[#f87171]/10 px-4 py-2 font-ui text-xs font-bold uppercase tracking-[0.08em] text-[#f87171]"
                        disabled={deleteSalesperson.isPending}
                      >
                        {deleteSalesperson.isPending ? 'Removing...' : 'Remove'}
                      </button>
                    ) : (
                      <span className="rounded-xl border border-white/10 px-4 py-2 font-ui text-xs font-bold uppercase tracking-[0.08em] text-secondary">
                        Login blocked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {sheetMode ? (
        <SalespersonSheet
          mode={sheetMode}
          salesperson={selectedSalesperson}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  )
}
