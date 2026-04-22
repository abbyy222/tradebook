import { useEffect, useState } from 'react'
import type Dexie from 'dexie'
import { db } from '@/db'
import { syncEngine } from '@/services/syncEngine'

type SyncSnapshot = {
  pending: number
  failed: number
}

export const SyncStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showSynced, setShowSynced] = useState(false)
  const [snapshot, setSnapshot] = useState<SyncSnapshot>({ pending: 0, failed: 0 })
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      setShowSynced(true)
      window.setTimeout(() => setShowSynced(false), 3500)
    }
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const readSnapshot = async () => {
      const countQueuedOrPending = <T extends { syncStatus: string }>(table: Dexie.Table<T, string>) =>
        table.filter((row) => row.syncStatus === 'QUEUED' || row.syncStatus === 'PENDING').count()

      const [
        salesPending,
        salesFailed,
        expensesPending,
        expensesFailed,
        stockPending,
        stockFailed,
        stockAdjustmentPending,
        stockAdjustmentFailed,
        debtorsPending,
        debtorsFailed,
        savingsPending,
        savingsFailed,
        suppliersPending,
        suppliersFailed,
      ] = await Promise.all([
        countQueuedOrPending(db.sales),
        db.sales.where('syncStatus').equals('FAILED').count(),
        countQueuedOrPending(db.expenses),
        db.expenses.where('syncStatus').equals('FAILED').count(),
        countQueuedOrPending(db.stockItems),
        db.stockItems.where('syncStatus').equals('FAILED').count(),
        countQueuedOrPending(db.stockAdjustments),
        db.stockAdjustments.where('syncStatus').equals('FAILED').count(),
        countQueuedOrPending(db.debtors),
        db.debtors.where('syncStatus').equals('FAILED').count(),
        countQueuedOrPending(db.savings),
        db.savings.where('syncStatus').equals('FAILED').count(),
        countQueuedOrPending(db.suppliers),
        db.suppliers.where('syncStatus').equals('FAILED').count(),
      ])

      if (cancelled) return

      setSnapshot({
        pending: salesPending + expensesPending + stockPending + stockAdjustmentPending + debtorsPending + savingsPending + suppliersPending,
        failed: salesFailed + expensesFailed + stockFailed + stockAdjustmentFailed + debtorsFailed + savingsFailed + suppliersFailed,
      })
    }

    void readSnapshot()
    const interval = window.setInterval(() => {
      void readSnapshot()
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const isOffline = !isOnline
  const hasPendingWork = snapshot.pending > 0 || snapshot.failed > 0
  const hasFailures = snapshot.failed > 0

  if (isOnline && !showSynced && !hasPendingWork) return null

  const message = isOffline
    ? `Offline - ${snapshot.pending || snapshot.failed ? `${snapshot.pending + snapshot.failed} records saved on your phone` : 'records saved on your phone'}`
    : hasFailures
      ? `${snapshot.failed} record${snapshot.failed === 1 ? '' : 's'} need attention`
      : snapshot.pending > 0
        ? `${snapshot.pending} record${snapshot.pending === 1 ? '' : 's'} waiting to sync`
        : 'Back online - records synced'

  const accent = isOffline ? '#f87171' : hasFailures ? '#f0bc5a' : snapshot.pending > 0 ? '#9aaad8' : '#4ecca3'

  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2 animate-slide-down"
      style={{
        background: isOffline
          ? 'rgba(226, 75, 74, 0.1)'
          : hasFailures
            ? 'rgba(232, 168, 56, 0.12)'
            : snapshot.pending > 0
              ? 'rgba(117, 133, 200, 0.12)'
              : 'rgba(78, 204, 163, 0.1)',
        borderBottom: `1px solid ${
          isOffline
            ? 'rgba(226,75,74,0.2)'
            : hasFailures
              ? 'rgba(232,168,56,0.22)'
              : snapshot.pending > 0
                ? 'rgba(117,133,200,0.22)'
                : 'rgba(78,204,163,0.2)'
        }`,
      }}
    >
      <span
        className="rounded-full flex-shrink-0 animate-pulse"
        style={{
          width: 6,
          height: 6,
          background: accent,
        }}
      />
      <span
        className="font-ui font-semibold text-xs tracking-wide uppercase"
        style={{ color: accent, letterSpacing: '0.06em' }}
      >
        {message}
      </span>
      {isOnline && hasPendingWork && (
        <button
          onClick={async () => {
            setIsRetrying(true)
            try {
              await syncEngine.syncAll()
            } finally {
              setIsRetrying(false)
            }
          }}
          disabled={isRetrying}
          className="rounded-full px-3 py-1 font-ui font-bold text-[10px] uppercase"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#f5ede0',
            border: '1px solid rgba(255,255,255,0.1)',
            letterSpacing: '0.08em',
          }}
        >
          {isRetrying ? 'Syncing...' : 'Retry now'}
        </button>
      )}
    </div>
  )
}
