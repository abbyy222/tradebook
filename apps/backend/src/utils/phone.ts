export const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')

  if (!digits) return trimmed

  // Nigeria-focused normalization for consistent matching/storage.
  if (digits.length === 11 && digits.startsWith('0')) return `+234${digits.slice(1)}`
  if (digits.length === 10) return `+234${digits}`
  if (digits.length === 13 && digits.startsWith('234')) return `+${digits}`

  return hasPlus ? `+${digits}` : `+${digits}`
}

export const phoneLookupCandidates = (value: string) => {
  const cleaned = value.trim()
  const digits = cleaned.replace(/\D/g, '')
  const normalized = normalizePhoneNumber(cleaned)
  const normalizedDigits = normalized.replace(/^\+/, '')

  const set = new Set<string>()
  set.add(cleaned)
  set.add(digits)
  set.add(normalized)
  set.add(normalizedDigits)

  if (digits.length === 11 && digits.startsWith('0')) {
    set.add(`+234${digits.slice(1)}`)
  }
  if (digits.length === 10) {
    set.add(`+234${digits}`)
  }
  if (digits.length === 13 && digits.startsWith('234')) {
    set.add(`+${digits}`)
    set.add(`0${digits.slice(3)}`)
  }

  return Array.from(set).filter(Boolean)
}
