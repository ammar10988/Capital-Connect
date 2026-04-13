import { supabase } from './supabase'

interface GatewayLoginResponse {
  session: {
    access_token: string
    refresh_token: string
  }
}

async function extractGatewayError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Authentication request failed'
  }

  const response = (error as Error & { context?: Response }).context
  if (!response) {
    return error.message || 'Authentication request failed'
  }

  const body = await response.text()
  if (!body) {
    return error.message || 'Authentication request failed'
  }

  return body
}

async function invokeGateway<T>(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<T>('auth-gateway', { body })

  if (error) {
    throw new Error(await extractGatewayError(error))
  }

  return data
}

export async function loginWithGateway(email: string, password: string) {
  const data = await invokeGateway<GatewayLoginResponse>({ action: 'login', email, password })

  if (!data?.session?.access_token || !data.session.refresh_token) {
    throw new Error('Authentication response was incomplete')
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })

  if (sessionError) throw sessionError
}

export async function registerWithGateway(input: {
  email: string
  password: string
  redirectTo: string
  data: Record<string, unknown>
}) {
  await invokeGateway({
    action: 'register',
    email: input.email,
    password: input.password,
    redirectTo: input.redirectTo,
    data: input.data,
  })
}

export async function requestPasswordResetWithGateway(email: string, redirectTo?: string) {
  await invokeGateway({ action: 'request_password_reset', email, redirectTo })
}

export async function verifyCurrentPasswordWithGateway(email: string, password: string) {
  await invokeGateway({ action: 'verify_password', email, password })
}
