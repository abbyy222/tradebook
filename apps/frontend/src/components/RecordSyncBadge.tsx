import type { CSSProperties } from 'react'

type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED'

const THEMES: Record<SyncStatus, { label: string; style: CSSProperties }> = {
  PENDING: {
    label: 'Saved offline',
    style: {
      background: 'rgba(117,133,200,0.12)',
      color: '#9aaad8',
      border: '1px solid rgba(117,133,200,0.22)',
    },
  },
  SYNCED: {
    label: 'Synced',
    style: {
      background: 'rgba(78,204,163,0.12)',
      color: '#4ecca3',
      border: '1px solid rgba(78,204,163,0.22)',
    },
  },
  FAILED: {
    label: 'Needs retry',
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
  const theme = THEMES[syncStatus ?? 'SYNCED']

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <span
        className="rounded-full px-2.5 py-1 font-ui font-bold text-[10px]"
        style={{
          ...theme.style,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {theme.label}
      </span>
      {syncStatus === 'FAILED' && onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full px-2.5 py-1 font-ui font-bold text-[10px]"
          style={{
            background: 'rgba(245,237,224,0.06)',
            color: '#f5ede0',
            border: '1px solid rgba(245,237,224,0.12)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
