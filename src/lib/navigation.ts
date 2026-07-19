export function safeReturnTo(value: string | null, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }
  return value
}

export function withReturnTo(path: string, returnTo: string): string {
  const params = new URLSearchParams({ returnTo })
  return `${path}?${params.toString()}`
}
