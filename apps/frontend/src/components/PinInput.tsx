// src/components/PinInput.tsx
// Four tactile PIN boxes.
// Each box has a warm terracotta focus ring.
// The filled state gets a subtle gold bottom border — like a lit market lamp.

import { useRef } from 'react'

interface PinInputProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

export const PinInput = ({ value, onChange, disabled }: PinInputProps) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return
    const arr = value.split('')
    arr[index] = char.slice(-1)
    const next = arr.join('')
    onChange(next.slice(0, 4))
    if (char && index < 3) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const arr = value.split('')
      arr[index - 1] = ''
      onChange(arr.join(''))
      inputs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map(i => {
        const isFilled = !!value[i]
        return (
          <input
            key={i}
            ref={el => { inputs.current[i] = el }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ''}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            disabled={disabled}
            aria-label={`PIN digit ${i + 1}`}
            style={{
              width: 64,
              height: 72,
              background: isFilled ? 'rgba(232,168,56,0.07)' : '#2e1c14',
              border: isFilled
                ? '1.5px solid rgba(232,168,56,0.4)'
                : '1.5px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              color: '#f5ede0',
              fontFamily: "'Fraunces', serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              textAlign: 'center',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, transform 0.15s ease',
              cursor: disabled ? 'not-allowed' : 'text',
              opacity: disabled ? 0.5 : 1,
              // Security: mask the digit visually
              WebkitTextSecurity: 'disc',
            } as React.CSSProperties}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#c4622d'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,98,45,0.18)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = isFilled
                ? 'rgba(232,168,56,0.4)'
                : 'rgba(255,255,255,0.08)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          />
        )
      })}
    </div>
  )
}