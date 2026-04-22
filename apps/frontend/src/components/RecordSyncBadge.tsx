import { type CSSProperties } from 'react'
import type { SyncStatus } from '@/services/syncStatus'

const THEMES: Record<
  SyncStatus,
  { label: string; shortLabel: string; icon: string; style: CSSProperties }
> = {
  QUEUED: {
    label: 'Queued',
    shortLabel: 'Queued',
    icon: 'o',
    style: {
      background: 'rgba(117,133,200,0.12)',
      color: '#9aaad8',
      border: '1px solid rgba(117,133,200,0.22)',
    },
  },
  PENDING: {
    label: 'Saved offline',
    shortLabel: 'Offline',
    icon: 'o',
    style: {
      background: 'rgba(117,133,200,0.12)',
      color: '#9aaad8',
      border: '1px solid rgba(117,133,200,0.22)',
    },
  },
  SYNCED: {
    label: 'Synced',
    shortLabel: 'Synced',
    icon: '✓',
    style: {
      background: 'rgba(78,204,163,0.12)',
      color: '#4ecca3',
      border: '1px solid rgba(78,204,163,0.22)',
    },
  },
  FAILED: {
    label: 'Needs retry',
    shortLabel: 'Retry',
    icon: '!',
    style: {
      background: 'rgba(248,113,113,0.12)',
      color: '#f87171',
      border: '1px solid rgba(248,113,113,0.22)',
    },
  },
}

export const RecordSyncBadge = ({
  syncStatus,
  onRetry,
}: {
  syncStatus?: SyncStatus
  onRetry?: () => void
}) => {
  const status = syncStatus ?? 'SYNCED'
  const theme = THEMES[status]

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-ui font-bold text-[10px]"
        style={{
          ...theme.style,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
        title={theme.label}
        aria-label={theme.label}
      >
        <span aria-hidden="true">{theme.icon}</span>
        <span className="hidden sm:inline">{theme.label}</span>
        <span className="sm:hidden">{theme.shortLabel}</span>
      </span>
      {status === 'FAILED' && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-ui font-bold text-[10px]"
          style={{
            background: 'rgba(245,237,224,0.06)',
            color: '#f5ede0',
            border: '1px solid rgba(245,237,224,0.12)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span aria-hidden="true">↻</span>
          Retry
        </button>
      )}
    </div>
  )
}
