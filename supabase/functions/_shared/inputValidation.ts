const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function parseJsonObject(req: Request): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }

  if (!isPlainObject(parsed)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return parsed;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function requireEmail(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const normalized = normalizeEmail(value);
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }

  return normalized;
}

export function requireUuid(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!UUID_PATTERN.test(trimmed)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }

  return trimmed;
}

export function requireEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
): T {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }

  return value as T;
}

export function sanitizeText(
  value: unknown,
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    multiline?: boolean;
    allowEmpty?: boolean;
  },
): string | null {
  if (value == null || value === "") {
    return options?.allowEmpty ? null : "";
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const collapsed = options?.multiline
    ? withoutControls.replace(/\r\n/g, "\n")
    : withoutControls.replace(/\s+/g, " ");
  const trimmed = collapsed.trim();

  if (!trimmed) {
    if (options?.allowEmpty) {
      return null;
    }
    if (options?.minLength) {
      throw new ValidationError(`${fieldName} is required`);
    }
    return "";
  }

  if (/[<>]/.test(trimmed) || /\b(?:javascript|data|vbscript)\s*:/i.test(trimmed)) {
    throw new ValidationError(`${fieldName} contains unsafe content`);
  }

  if (options?.minLength && trimmed.length < options.minLength) {
    throw new ValidationError(`${fieldName} must be at least ${options.minLength} characters`);
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${options.maxLength} characters`);
  }

  return trimmed;
}

export function requireOptionalHttpUrl(value: unknown, fieldName: string): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ValidationError(`${fieldName} must use http or https`);
  }

  return url.toString();
}

export function sanitizeMetadata(input: unknown): Record<string, string | number | boolean | null> {
  if (input == null) {
    return {};
  }

  if (!isPlainObject(input)) {
    throw new ValidationError("data must be an object");
  }

  const entries = Object.entries(input);
  if (entries.length > 20) {
    throw new ValidationError("data contains too many fields");
  }

  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, rawValue] of entries) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) {
      throw new ValidationError("data contains an invalid field name");
    }

    if (typeof rawValue === "string") {
      sanitized[key] = sanitizeText(rawValue, `data.${key}`, {
        maxLength: 500,
        multiline: true,
        allowEmpty: true,
      });
      continue;
    }

    if (
      rawValue === null ||
      typeof rawValue === "boolean" ||
      typeof rawValue === "number"
    ) {
      sanitized[key] = rawValue;
      continue;
    }

    throw new ValidationError(`data.${key} has an unsupported type`);
  }

  return sanitized;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
