const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024

function sanitizeControlChars(value: string, multiline = false) {
  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  const normalized = multiline ? withoutControls.replace(/\r\n/g, '\n') : withoutControls.replace(/\s+/g, ' ')
  return normalized.trim()
}

function containsUnsafeMarkup(value: string) {
  return /[<>]/.test(value) || /\b(?:javascript|data|vbscript)\s*:/i.test(value)
}

export function sanitizePlainText(value: string, options?: { maxLength?: number; multiline?: boolean }) {
  const sanitized = sanitizeControlChars(value, options?.multiline)
  if (containsUnsafeMarkup(sanitized)) {
    throw new Error('Input contains unsafe markup')
  }
  if (options?.maxLength && sanitized.length > options.maxLength) {
    throw new Error(`Input must be at most ${options.maxLength} characters`)
  }
  return sanitized
}

export function sanitizeOptionalUrl(value: string, fieldName = 'URL') {
  const sanitized = sanitizePlainText(value)
  if (!sanitized) {
    return ''
  }

  const url = new URL(sanitized)
  if (!SAFE_URL_PROTOCOLS.has(url.protocol)) {
    throw new Error(`${fieldName} must use http or https`)
  }

  return url.toString()
}

export function assertUuid(value: string, fieldName = 'id') {
  const normalized = sanitizePlainText(value)
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} is invalid`)
  }
  return normalized
}

export function validateMobileImageAsset(input: {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
}) {
  const fileName = input.fileName ?? input.uri.split('/').pop() ?? 'upload.jpg'
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  const mimeType = input.mimeType ?? ''

  if (!IMAGE_EXTENSIONS.has(extension) || (mimeType && !IMAGE_MIME_TYPES.has(mimeType))) {
    throw new Error('Image must be a JPG, PNG, or WebP file')
  }

  if (input.fileSize != null && (input.fileSize <= 0 || input.fileSize > AVATAR_MAX_SIZE_BYTES)) {
    throw new Error('Image must be smaller than 2MB')
  }

  return { extension, mimeType: mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}` }
}

export function canOpenHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return SAFE_URL_PROTOCOLS.has(url.protocol)
  } catch {
    return false
  }
}
