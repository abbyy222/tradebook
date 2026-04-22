import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSubmitFeedback } from '@/hooks/useFeedback'
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@tradebook/shared-types'

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 9.5h10M7 13h7m-8.5 6.5L7 17h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h.5v2.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const FeedbackWidget = () => {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('App bug')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const location = useLocation()
  const submitFeedback = useSubmitFeedback()

  useEffect(() => {
    if (!open) return

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [open])

  const handleOpen = () => {
    setOpen(true)
    setError('')
    setSuccess('')
  }

  const handleClose = () => {
    setOpen(false)
    setError('')
    setSuccess('')
  }

  const canSubmit = message.trim().length >= 8 && !submitFeedback.isPending

  const handleSubmit = async () => {
    if (!canSubmit) return

    setError('')
    setSuccess('')

    try {
      await submitFeedback.mutateAsync({
        category,
        message: message.trim(),
        reporterName: name.trim() || undefined,
        pagePath: location.pathname,
      })

      setSuccess('Complaint sent successfully. Our team has been notified.')
      setMessage('')
      setName('')
      setCategory('App bug')
    } catch (err) {
      const responseError = err as { response?: { data?: { error?: { message?: string } } } }
      setError(responseError.response?.data?.error?.message ?? 'Unable to send complaint right now')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-2xl transition-transform duration-200 hover:scale-105 active:scale-95 sm:right-4 sm:h-14 sm:w-14 md:bottom-6"
        style={{
          background: 'linear-gradient(135deg, #c04818, #e8a838)',
          boxShadow: '0 14px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.18) inset',
        }}
        aria-label="Open feedback"
        title="Lodge a complaint"
      >
        <MessageIcon />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:p-3 md:items-center md:p-6"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        >
          <div
            className="w-full max-w-xl rounded-t-3xl border border-white/10 bg-[#231510] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto sm:rounded-2xl sm:p-4 md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-base mb-1">Need help?</p>
                <h3 className="font-display text-xl font-bold text-primary wonky md:text-2xl">
                  Lodge your complaint
                </h3>
                <p className="mt-1 text-xs text-secondary">
                  Tell us what happened and we will get back to you.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-secondary"
                aria-label="Close feedback"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {FEEDBACK_CATEGORIES.map((item) => {
                const active = item === category
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em]"
                    style={{
                      background: active ? 'rgba(232,168,56,0.16)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#f0bc5a' : 'rgba(245,237,224,0.68)',
                      border: `1px solid ${active ? 'rgba(232,168,56,0.3)' : 'rgba(255,255,255,0.12)'}`,
                    }}
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                className="input-base"
                placeholder="Your name (optional)"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input className="input-base" value={location.pathname} disabled />
            </div>

            <textarea
              className="input-base mt-2 min-h-[140px] w-full resize-none"
              placeholder="Describe the issue clearly (what you did, what you expected, what happened)."
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                if (error) setError('')
                if (success) setSuccess('')
              }}
            />

            {error ? <p className="mt-2 text-xs text-[#f87171]">{error}</p> : null}
            {success ? <p className="mt-2 text-xs text-[#4ecca3]">{success}</p> : null}

            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-secondary sm:min-w-[110px]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-full bg-gradient-to-r from-[#c04818] to-[#e8a838] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50 sm:min-w-[160px]"
              >
                {submitFeedback.isPending ? 'Sending...' : 'Send complaint'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
