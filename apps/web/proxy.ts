import {
  getNEXO_DOMAIN_VAL,
  getNEXO_TOP_DOMAIN_VAL,
  getDefaultOrg,
  getUriWithOrg,
  isMultiOrgModeEnabled,
} from './services/config/config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /fonts (inside /public)
     * 4. Umami Analytics
     * 4. /examples (inside /public)
     * 5. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|fonts|umami|examples|[\\w-]+\\.\\w+).*)',
    '/sitemap.xml',
    '/payments/stripe/connect/oauth',
  ],
}

export default async function proxy(req: NextRequest) {
  // Get initial data
  const hosting_mode = isMultiOrgModeEnabled() ? 'multi' : 'single'
  const default_org = getDefaultOrg()
  const { pathname, search } = req.nextUrl
  const fullhost = req.headers ? req.headers.get('host') : ''
  const cookie_orgslug = req.cookies.get('nexo_current_orgslug')?.value
  

  // Out of orgslug paths & rewrite
  const standard_paths = ['/home']
  const auth_paths = ['/login', '/signup', '/reset', '/forgot']
  if (standard_paths.includes(pathname)) {
    // Redirect to the same pathname with the original search params
    return NextResponse.rewrite(new URL(`${pathname}${search}`, req.url))
  }

  if (auth_paths.includes(pathname)) {
    // Auth layout requires orgslug in query params. Ensure we always provide one:
    // - prefer explicit ?orgslug=
    // - else cookie orgslug
    // - else derive from host (multi-org)
    // - else default org (single-org)
    const searchParams = new URLSearchParams(search)
    const hadOrgslugParam = Boolean(searchParams.get('orgslug'))
    let orgslug = searchParams.get('orgslug') || cookie_orgslug || ''

    if (!orgslug) {
      if (hosting_mode === 'multi') {
        const NEXO_DOMAIN = getNEXO_DOMAIN_VAL()
        orgslug = fullhost ? fullhost.replace(`.${NEXO_DOMAIN}`, '') : (default_org as string)
      } else {
        orgslug = default_org as string
      }
    }

    // If user hits /login directly (no orgslug), redirect to the canonical URL with orgslug.
    // This fixes entrypoints like course paywalls / purchase flows that navigate to /login.
    if (!hadOrgslugParam) {
      const redirectUrl = new URL(`${pathname}`, req.url)
      // Preserve existing search params and inject orgslug
      searchParams.set('orgslug', orgslug)
      redirectUrl.search = searchParams.toString()
      return NextResponse.redirect(redirectUrl)
    }

    // Inject orgslug so /app/auth/layout.tsx doesn't render the "Organization not specified" error.
    searchParams.set('orgslug', orgslug)
    const rewriteUrl = new URL(`/auth${pathname}`, req.url)
    rewriteUrl.search = searchParams.toString()
    const response = NextResponse.rewrite(rewriteUrl)

    // Persist orgslug for the rest of the app.
    const NEXO_TOP_DOMAIN = getNEXO_TOP_DOMAIN_VAL()
    response.cookies.set({
      name: 'nexo_current_orgslug',
      value: orgslug,
      domain: NEXO_TOP_DOMAIN == 'localhost' ? '' : NEXO_TOP_DOMAIN,
      path: '/',
    })

    return response
  }


  // Dynamic Pages Editor
  if (pathname.match(/^\/course\/[^/]+\/activity\/[^/]+\/edit$/)) {
    return NextResponse.rewrite(new URL(`/editor${pathname}`, req.url))
  }

  // Check if the request is for the Stripe callback URL
  if (req.nextUrl.pathname.startsWith('/payments/stripe/connect/oauth')) {
    const searchParams = req.nextUrl.searchParams
    const orgslug = searchParams.get('state')?.split('_')[0] // Assuming state parameter contains orgslug_randomstring
    
    // Construct the new URL with the required parameters
    const redirectUrl = new URL('/payments/stripe/connect/oauth', req.url)
    
    // Preserve all original search parameters
    searchParams.forEach((value, key) => {
      redirectUrl.searchParams.append(key, value)
    })
    
    // Add orgslug if available
    if (orgslug) {
      redirectUrl.searchParams.set('orgslug', orgslug)
    }

    return NextResponse.rewrite(redirectUrl)
  }

  // Stripe Checkout return page (post-checkout verification happens in-app).
  // Do NOT rewrite under /orgs/*, otherwise the route won't exist (it's shared and org is provided via query/cookie).
  if (req.nextUrl.pathname.startsWith('/payments/stripe/checkout/start')) {
    const searchParams = req.nextUrl.searchParams
    const orgslug = searchParams.get('orgslug') || cookie_orgslug || (default_org as string)
    const rewriteUrl = new URL('/payments/stripe/checkout/start', req.url)

    // Preserve all original search parameters
    searchParams.forEach((value, key) => {
      rewriteUrl.searchParams.append(key, value)
    })
    rewriteUrl.searchParams.set('orgslug', orgslug)

    const response = NextResponse.rewrite(rewriteUrl)
    const NEXO_TOP_DOMAIN = getNEXO_TOP_DOMAIN_VAL()
    response.cookies.set({
      name: 'nexo_current_orgslug',
      value: orgslug,
      domain: NEXO_TOP_DOMAIN == 'localhost' ? '' : NEXO_TOP_DOMAIN,
      path: '/',
    })
    return response
  }

  if (req.nextUrl.pathname.startsWith('/payments/stripe/checkout/return')) {
    const searchParams = req.nextUrl.searchParams
    const orgslug = searchParams.get('orgslug') || cookie_orgslug || (default_org as string)
    const rewriteUrl = new URL('/payments/stripe/checkout/return', req.url)

    // Preserve all original search parameters
    searchParams.forEach((value, key) => {
      rewriteUrl.searchParams.append(key, value)
    })
    rewriteUrl.searchParams.set('orgslug', orgslug)

    const response = NextResponse.rewrite(rewriteUrl)
    const NEXO_TOP_DOMAIN = getNEXO_TOP_DOMAIN_VAL()
    response.cookies.set({
      name: 'nexo_current_orgslug',
      value: orgslug,
      domain: NEXO_TOP_DOMAIN == 'localhost' ? '' : NEXO_TOP_DOMAIN,
      path: '/',
    })
    return response
  }

  // Health Check
  if (pathname.startsWith('/health')) {
    return NextResponse.rewrite(new URL(`/api/health`, req.url))
  }

  // Auth Redirects
  if (pathname == '/redirect_from_auth') {
    if (cookie_orgslug) {
      const searchParams = req.nextUrl.searchParams
      const queryString = searchParams.toString()
      const redirectPathname = '/'

      // Always redirect relative to the current request origin (keeps localhost:3000 in dev).
      // In single-org mode, orgslug doesn't affect the hostname; it's handled by rewrites.
      const redirectUrl = new URL(redirectPathname, req.url)

      if (queryString) {
        redirectUrl.search = queryString
      }
      return NextResponse.redirect(redirectUrl)
    } else {
      return 'Did not find the orgslug in the cookie'
    }
  }

  if (pathname.startsWith('/sitemap.xml')) {
    let orgslug: string;
    
    const NEXO_DOMAIN = getNEXO_DOMAIN_VAL()
    if (hosting_mode === 'multi') {
      orgslug = fullhost
        ? fullhost.replace(`.${NEXO_DOMAIN}`, '')
        : (default_org as string);
    } else {
      // Single hosting mode
      orgslug = default_org as string;
    }

    const sitemapUrl = new URL(`/api/sitemap`, req.url);

    // Create a response object
    const response = NextResponse.rewrite(sitemapUrl);

    // Set the orgslug in a header
    response.headers.set('X-Sitemap-Orgslug', orgslug);

    return response;
  }

  // Multi Organization Mode
  if (hosting_mode === 'multi') {
    // Get the organization slug from the URL
    const NEXO_DOMAIN = getNEXO_DOMAIN_VAL()
    const NEXO_TOP_DOMAIN = getNEXO_TOP_DOMAIN_VAL()
    const orgslug = fullhost
      ? fullhost.replace(`.${NEXO_DOMAIN}`, '')
      : (default_org as string)
    const response = NextResponse.rewrite(
      new URL(`/orgs/${orgslug}${pathname}`, req.url)
    )

    // Set the cookie with the orgslug value
    response.cookies.set({
      name: 'nexo_current_orgslug',
      value: orgslug,
      domain: NEXO_TOP_DOMAIN == 'localhost' ? '' : NEXO_TOP_DOMAIN,
      path: '/',
    })

    return response
  }

  // Single Organization Mode
  if (hosting_mode === 'single') {
    // Get the default organization slug
    const NEXO_TOP_DOMAIN = getNEXO_TOP_DOMAIN_VAL()
    const orgslug = default_org as string
    const response = NextResponse.rewrite(
      new URL(`/orgs/${orgslug}${pathname}`, req.url)
    )

    // Set the cookie with the orgslug value
    response.cookies.set({
      name: 'nexo_current_orgslug',
      value: orgslug,
      domain: NEXO_TOP_DOMAIN == 'localhost' ? '' : NEXO_TOP_DOMAIN,
      path: '/',
    })

    return response
  }
}
