import type { User } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

export const PASSWORD_MIN_LENGTH = 12
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000
export const SESSION_BACKGROUND_TIMEOUT_MS = 30 * 60 * 1000
export const SESSION_STARTED_AT_KEY = 'cc.auth.session-started-at'
export const SESSION_LAST_BACKGROUND_AT_KEY = 'cc.auth.last-background-at'

const passwordChecks = [
  { regex: /[a-z]/, message: 'Include at least one lowercase letter' },
  { regex: /[A-Z]/, message: 'Include at least one uppercase letter' },
  { regex: /[0-9]/, message: 'Include at least one number' },
  { regex: /[^A-Za-z0-9]/, message: 'Include at least one symbol' },
]

export function assertPublicSupabaseKey(key: string, envName: string) {
  const parts = key.split('.')
  const decoder = globalThis.atob?.bind(globalThis)
  if (parts.length !== 3 || !decoder) return

  let payload: { role?: string } | null = null
  try {
    payload = JSON.parse(decoder(parts[1])) as { role?: string }
  } catch {
    return
  }

  if (payload.role === 'service_role' || payload.role === 'supabase_admin') {
    throw new Error(`${envName} is using a privileged Supabase key. Only a public anon/publishable key is allowed in the mobile app.`)
  }
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }

  const failed = passwordChecks.find((check) => !check.regex.test(password))
  return failed?.message ?? null
}

export function isVerifiedUser(user: User | null) {
  return Boolean(user?.email_confirmed_at)
}

export async function markSessionStarted(timestamp = Date.now()) {
  await SecureStore.setItemAsync(SESSION_STARTED_AT_KEY, String(timestamp))
  await SecureStore.deleteItemAsync(SESSION_LAST_BACKGROUND_AT_KEY)
}

export async function clearSessionTracking() {
  await Promise.all([
    SecureStore.deleteItemAsync(SESSION_STARTED_AT_KEY),
    SecureStore.deleteItemAsync(SESSION_LAST_BACKGROUND_AT_KEY),
  ])
}

export async function markBackgrounded(timestamp = Date.now()) {
  await SecureStore.setItemAsync(SESSION_LAST_BACKGROUND_AT_KEY, String(timestamp))
}

export async function clearBackgroundedAt() {
  await SecureStore.deleteItemAsync(SESSION_LAST_BACKGROUND_AT_KEY)
}

export async function hasTrackedSessionExpired(now = Date.now()) {
  const [startedAtRaw, backgroundedAtRaw] = await Promise.all([
    SecureStore.getItemAsync(SESSION_STARTED_AT_KEY),
    SecureStore.getItemAsync(SESSION_LAST_BACKGROUND_AT_KEY),
  ])

  const startedAt = startedAtRaw ? Number(startedAtRaw) : null
  const backgroundedAt = backgroundedAtRaw ? Number(backgroundedAtRaw) : null

  if (startedAt && !Number.isNaN(startedAt) && now - startedAt > SESSION_MAX_AGE_MS) {
    return true
  }

  if (backgroundedAt && !Number.isNaN(backgroundedAt) && now - backgroundedAt > SESSION_BACKGROUND_TIMEOUT_MS) {
    return true
  }

  return false
}

export function formatAuthError(error: unknown) {
  const fallback = 'Authentication failed'
  if (!(error instanceof Error)) return fallback

  try {
    const parsed = JSON.parse(error.message) as {
      error?: string
      code?: string
      retry_after_seconds?: number
    }

    if (parsed.code === 'rate_limit_exceeded' && parsed.retry_after_seconds) {
      const minutes = Math.ceil(parsed.retry_after_seconds / 60)
      return `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
    }

    if (parsed.code === 'email_not_verified') {
      return 'Verify your email before signing in.'
    }

    return parsed.error || error.message || fallback
  } catch {
    return error.message || fallback
  }
}
