// src/layouts/AuthLayout.tsx
// Wraps login + register pages.
// Features two slowly drifting radial light orbs â€” one terracotta, one gold.
// Beneath them is a subtle dot-grid pattern (the kente fabric nod).
// The brand mark uses Fraunces italic for "Book" â€” editorial contrast.

import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export const AuthLayout = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden surface-0 px-6 py-10">

      {/* â”€â”€ Dot grid texture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="absolute inset-0 pattern-dots pointer-events-none" />

      {/* â”€â”€ Terracotta orb â€” top left â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Soft light that mimics a lantern hanging in a market stall  */}
      <div
        className="absolute rounded-full pointer-events-none animate-drift-1"
        style={{
          width: 560,
          height: 560,
          top: '-160px',
          left: '-160px',
          background: 'radial-gradient(circle, rgba(192,72,24,0.18) 0%, rgba(196,98,45,0.07) 40%, transparent 70%)',
        }}
      />

      {/* â”€â”€ Gold orb â€” bottom right â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Warm glow like brass lamps at the evening market            */}
      <div
        className="absolute rounded-full pointer-events-none animate-drift-2"
        style={{
          width: 480,
          height: 480,
          bottom: '-120px',
          right: '-120px',
          background: 'radial-gradient(circle, rgba(232,168,56,0.14) 0%, rgba(200,120,10,0.05) 40%, transparent 70%)',
        }}
      />

      {/* â”€â”€ Indigo ambient â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Deep cool undertone balances the warm accents               */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          top: '40%',
          left: '60%',
          background: 'radial-gradient(circle, rgba(45,58,124,0.12) 0%, transparent 70%)',
        }}
      />

      {/* â”€â”€ Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col gap-8">

        {/* Brand mark */}
        <div className="text-center">
          <div className="inline-flex items-baseline gap-0.5 mb-1">
            <span
              className="font-ui font-extrabold text-3xl tracking-tight"
              style={{ color: '#f5ede0' }}
            >
              Trade
            </span>
            <span
              className="font-display italic font-bold text-3xl"
              style={{
                fontVariationSettings: "'WONK' 1, 'opsz' 30",
                color: '#e8a838',
              }}
            >
              Book
            </span>
          </div>
          <p className="text-xs font-ui tracking-widest uppercase text-muted mt-1">
            Your market, your records
          </p>
        </div>

        {/* Page renders here */}
        <Outlet />
      </div>
    </div>
  )
}
