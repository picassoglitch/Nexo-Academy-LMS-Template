// Runtime configuration cache
let runtimeConfig: Record<string, string> | null = null;

// Lazy load runtime configuration
function loadRuntimeConfig(): Record<string, string> {
  if (runtimeConfig !== null) {
    return runtimeConfig;
  }

  runtimeConfig = {};

  if (typeof window !== 'undefined') {
    // Client-side: read from window.__RUNTIME_CONFIG__ if available
    if ((window as any).__RUNTIME_CONFIG__) {
      runtimeConfig = (window as any).__RUNTIME_CONFIG__;
    }
  } else {
    // Server-side: try to read from runtime-config.json
    // Try multiple possible paths for standalone mode
    try {
      const fs = require('fs');
      const path = require('path');
      
      // In standalone mode, runtime-config.json is in the same directory as server.js
      // Try common possible locations relative to the current working directory and module
      const possiblePaths = [
        path.join(process.cwd(), 'runtime-config.json'),
        path.join(__dirname || process.cwd(), 'runtime-config.json'),
        path.join(__dirname || process.cwd(), '..', 'runtime-config.json'),
      ];
      
      for (const configPath of possiblePaths) {
        try {
          if (fs.existsSync(configPath)) {
            runtimeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            break;
          }
        } catch {
          // Continue to next path
        }
      }
    } catch {
      // fs/path not available (client-side bundle), skip
    }
  }

  return runtimeConfig || {};
}

// Helper function to get config value with fallback
export const getConfig = (key: string, defaultValue: string = ''): string => {
  const config = loadRuntimeConfig();
  
  // 1. Check runtime config (from runtime-config.json or the generated runtime-config.js)
  if (config && config[key]) {
    return config[key];
  }

  // 2. Fallback to process.env (Server-side only)
  return process.env[key] || defaultValue;
};

// Dynamic config getters - these are functions to ensure runtime values are used
const getNEXO_HTTP_PROTOCOL = () =>
  (getConfig('NEXT_PUBLIC_NEXO_HTTPS') === 'true') ? 'https://' : 'http://'
const getNEXO_API_URL = () => getConfig('NEXT_PUBLIC_NEXO_API_URL', 'http://localhost/api/v1/')
const getNEXO_BACKEND_URL = () => getConfig('NEXT_PUBLIC_NEXO_BACKEND_URL', 'http://localhost/')
const getNEXO_DOMAIN = () => getConfig('NEXT_PUBLIC_NEXO_DOMAIN', 'localhost')
const getNEXO_TOP_DOMAIN = () => getConfig('NEXT_PUBLIC_NEXO_TOP_DOMAIN', 'localhost')

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
  return getConfig('NEXT_PUBLIC_NEXO_DEFAULT_ORG', 'default')
}




