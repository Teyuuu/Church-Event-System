/**
 * Lightweight form validation helpers
 */

/**
 * Accepts common Philippine mobile formats:
 * 09171234567, 0917-123-4567, 0917 123 4567, +639171234567, 639171234567
 * Empty values are considered valid (use `required` separately).
 */
export function isValidPhMobile(value) {
  if (!value || !value.trim()) return true
  const digits = value.replace(/[\s\-().]/g, '')
  return /^(\+?63|0)9\d{9}$/.test(digits)
}

export const PH_MOBILE_HINT = 'Use a PH mobile number, e.g. 0917-123-4567'

/**
 * Generate a readable temporary password (no ambiguous characters).
 */
export function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : null
  for (let i = 0; i < length; i++) {
    const idx = cryptoObj
      ? cryptoObj.getRandomValues(new Uint32Array(1))[0] % chars.length
      : Math.floor(Math.random() * chars.length)
    out += chars[idx]
  }
  return out
}
