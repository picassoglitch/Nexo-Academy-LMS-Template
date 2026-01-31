/**
 * Production config on Render must come from NEXT_PUBLIC_* env vars baked at build time.
 * We intentionally do NOT depend on runtime-config.js (it caused 404s and localhost fallbacks).
 */

let _didLog = false

const isProd = process.env.NODE_ENV === 'production'

function env(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]
    if (v && String(v).trim() !== '') return String(v)
  }
  return undefined
}

// Public helper (kept for backward-compat with existing imports like media.ts).
// IMPORTANT: Do not silently default to localhost for API URLs in production.
export const getConfig = (key: string, defaultValue: string = ''): string => {
  return env(key) || defaultValue
}

function ensureTrailingSlash(url: string) {
  return url.endsWith('/') ? url : `${url}/`
}

function ensureApiV1(url: string) {
  const trimmed = url.trim()
  // If caller gives full /api/v1 already, keep it.
  if (trimmed.includes('/api/v1')) {
    return ensureTrailingSlash(trimmed)
  }
  return ensureTrailingSlash(`${trimmed.replace(/\/+$/, '')}/api/v1`)
}

function resolveApiUrl() {
  // Support both the repo's old env vars and the user's Render env vars.
  const explicit = env('NEXT_PUBLIC_NEXO_API_URL', 'NEXT_PUBLIC_API_URL')
  if (explicit) return ensureApiV1(explicit)

  // Production default (avoid any localhost fallbacks).
  return 'https://api.nexo-ai.world/api/v1/'
}

function resolveBackendUrl() {
  const explicit = env('NEXT_PUBLIC_NEXO_BACKEND_URL', 'NEXT_PUBLIC_BACKEND_URL')
  if (explicit) return ensureTrailingSlash(explicit)

  const api = env('NEXT_PUBLIC_NEXO_API_URL', 'NEXT_PUBLIC_API_URL')
  if (api) return ensureTrailingSlash(api.replace(/\/api\/v1\/?$/, ''))

  // Production default (avoid any localhost fallbacks).
  return 'https://api.nexo-ai.world/'
}

function maybeDebugLog() {
  const debug = (!isProd) || env('NEXT_PUBLIC_DEBUG', 'DEBUG') === 'true'
  if (!debug || _didLog) return
  _didLog = true
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[config] API_URL =', resolveApiUrl())
  }
}

// Dynamic config getters
const getNEXO_HTTP_PROTOCOL = () =>
  (env('NEXT_PUBLIC_NEXO_HTTPS', 'NEXT_PUBLIC_HTTPS') === 'true') ? 'https://' : 'http://'
const getNEXO_API_URL = () => {
  const v = resolveApiUrl()
  maybeDebugLog()
  return v
}
const getNEXO_BACKEND_URL = () => resolveBackendUrl()
const getNEXO_DOMAIN = () => env('NEXT_PUBLIC_NEXO_DOMAIN', 'NEXT_PUBLIC_DOMAIN') || 'nexo-ai.world'
const getNEXO_TOP_DOMAIN = () => env('NEXT_PUBLIC_NEXO_TOP_DOMAIN', 'NEXT_PUBLIC_TOP_DOMAIN') || 'nexo-ai.world'

// Export getter functions for dynamic runtime configuration
export const getNEXO_HTTP_PROTOCOL_VAL = getNEXO_HTTP_PROTOCOL
export const getNEXO_BACKEND_URL_VAL = getNEXO_BACKEND_URL
export const getNEXO_DOMAIN_VAL = getNEXO_DOMAIN
export const getNEXO_TOP_DOMAIN_VAL = getNEXO_TOP_DOMAIN

// Export constants for backward compatibility
// These are computed once at module load, but getConfig uses runtime values
// For middleware/proxy (where runtime is critical), use the getter functions instead
export const NEXO_HTTP_PROTOCOL = getNEXO_HTTP_PROTOCOL()
export const NEXO_BACKEND_URL = getNEXO_BACKEND_URL()
export const NEXO_DOMAIN = getNEXO_DOMAIN()
export const NEXO_TOP_DOMAIN = getNEXO_TOP_DOMAIN()

// For direct usage, these call the getters
export const getAPIUrl = () => getNEXO_API_URL()
export const getBackendUrl = () => getNEXO_BACKEND_URL()

// Multi Organization Mode
export const isMultiOrgModeEnabled = () =>
  getConfig('NEXT_PUBLIC_NEXO_MULTI_ORG') === 'true' ? true : false

export const getUriWithOrg = (orgslug: string, path: string) => {
  const multi_org = isMultiOrgModeEnabled()
  const protocol = getNEXO_HTTP_PROTOCOL()
  const domain = getNEXO_DOMAIN()

  // Dev-friendly: when running on localhost, always keep the current host (including port).
  // This prevents links like http://localhost/login (port 80) when the dev server is on :3000.
  if (typeof window !== 'undefined') {
    const host = window.location.host // includes port
    const hostname = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''

    if (multi_org) {
      // orgslug.<hostname>:<port>
      return `${protocol}${orgslug}.${hostname}${port}${path}`
    }

    return `${protocol}${host}${path}`
  }

  if (multi_org) {
    return `${protocol}${orgslug}.${domain}${path}`
  }
  return `${protocol}${domain}${path}`
}

export const getUriWithoutOrg = (path: string) => {
  const multi_org = isMultiOrgModeEnabled()
  const protocol = getNEXO_HTTP_PROTOCOL()
  const domain = getNEXO_DOMAIN()

  if (typeof window !== 'undefined') {
    const host = window.location.host // includes port
    return `${protocol}${host}${path}`
  }

  if (multi_org) {
    return `${protocol}${domain}${path}`
  }
  return `${protocol}${domain}${path}`
}

export const getOrgFromUri = () => {
  const multi_org = isMultiOrgModeEnabled()
  if (multi_org) {
    getDefaultOrg()
  } else {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const domain = getNEXO_DOMAIN()

      return hostname.replace(`.${domain}`, '')
    }
  }
}

export const getDefaultOrg = () => {
  // In this codebase the canonical default org slug is "defaultorg" (see API autoinstall).
  // Allow overrides via either NEXT_PUBLIC_NEXO_DEFAULT_ORG or NEXT_PUBLIC_DEFAULT_ORG.
  const fallback = isProd ? 'defaultorg' : 'default'
  return env('NEXT_PUBLIC_NEXO_DEFAULT_ORG', 'NEXT_PUBLIC_DEFAULT_ORG') || fallback
}




