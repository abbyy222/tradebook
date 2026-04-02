import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export const ONBOARDING_STORAGE_KEY = 'tradebook-onboarding-v1-complete'

type OnboardingQuestProps = {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

type QuestStep = {
  title: string
  subtitle: string
  reward: string
  route: string
  actionLabel: string
  tip: string
}

const QUEST_STEPS: QuestStep[] = [
  {
    title: 'Mission 1: Dashboard Check',
    subtitle: 'Start every day here. It shows sales, debtors, stock alerts, and your monthly snapshot.',
    reward: '+20 clarity points',
    route: '/dashboard',
    actionLabel: 'Open Dashboard',
    tip: 'Watch Today, This Week, and Operating Profit first.',
  },
  {
    title: 'Mission 2: Record Sales',
    subtitle: 'Every sale goes here. This is your main money-in record.',
    reward: '+25 momentum points',
    route: '/sales',
    actionLabel: 'Open Sales',
    tip: 'Use the quick filters (Today, Yesterday, Last 7 Days).',
  },
  {
    title: 'Mission 3: Track Expenses',
    subtitle: 'Record money-out like rent, transport, restock, salary, and utilities.',
    reward: '+25 discipline points',
    route: '/expenses',
    actionLabel: 'Open Expenses',
    tip: 'Categorize expenses so reports stay useful later.',
  },
  {
    title: 'Mission 4: Manage Stock',
    subtitle: 'Add stock with cost price + selling price so the app can value inventory and margin.',
    reward: '+30 profit points',
    route: '/stock',
    actionLabel: 'Open Stock',
    tip: 'Set low-stock threshold to get early restock alerts.',
  },
  {
    title: 'Mission 5: Follow Up Debtors',
    subtitle: 'Track who owes you and record payments as they come in.',
    reward: '+30 cashflow points',
    route: '/debtors',
    actionLabel: 'Open Debtors',
    tip: 'Check this often so money customers owe you does not pile up.',
  },
]

export const OnboardingQuest = ({ open, onClose, onComplete }: OnboardingQuestProps) => {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)

  const step = QUEST_STEPS[stepIndex]
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / QUEST_STEPS.length) * 100),
    [stepIndex]
  )
  const isFirst = stepIndex === 0
  const isLast = stepIndex === QUEST_STEPS.length - 1

  if (!open) return null

  const finishQuest = () => {
    onComplete()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-[#e8a838]/30 bg-[#1f130e] p-5 md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="badge-gold">Tradebook Quest Guide</p>
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-ui font-bold uppercase tracking-[0.08em] text-secondary"
          >
            Close
          </button>
        </div>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs font-ui font-bold uppercase tracking-[0.1em] text-secondary">
            <span>Step {stepIndex + 1} of {QUEST_STEPS.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c4622d] to-[#e8a838] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <h2 className="font-display text-2xl font-bold leading-tight text-primary wonky">{step.title}</h2>
        <p className="mt-2 font-body text-sm text-secondary">{step.subtitle}</p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#2a1912] px-4 py-3">
          <p className="font-ui text-xs font-bold uppercase tracking-[0.09em] text-[#f0bc5a]">{step.reward}</p>
          <p className="mt-1 font-body text-xs text-secondary">{step.tip}</p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={isFirst}
              className="btn-ghost min-h-[42px] px-4 py-2 text-xs disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (isLast) {
                  finishQuest()
                  return
                }
                setStepIndex((prev) => prev + 1)
              }}
              className="btn-primary min-h-[42px] px-4 py-2 text-xs"
            >
              {isLast ? 'Finish Quest' : 'Next Mission'}
            </button>
          </div>

          <button
            onClick={() => {
              onClose()
              navigate(step.route)
            }}
            className="rounded-xl border border-[#e8a838]/40 bg-[#3a2319] px-4 py-2 text-xs font-ui font-bold uppercase tracking-[0.08em] text-[#f0bc5a]"
          >
            {step.actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
