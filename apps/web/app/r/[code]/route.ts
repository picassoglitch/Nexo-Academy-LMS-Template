import { NextRequest, NextResponse } from 'next/server'
import { getAPIUrl } from '@services/config/config'

/**
 * Affiliate redirect:
 *   /r/:code?org_id=123&return_to=/signup?orgslug=defaultorg
 *
 * Sets a cookie so signup/checkout can attribute the user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const p = await params
  const code = (p.code || '').trim()
  const orgId = req.nextUrl.searchParams.get('org_id') || ''
  const returnTo = req.nextUrl.searchParams.get('return_to') || '/'

  // Best-effort click tracking (public API endpoint). Never block redirect.
  try {
    const orgIdInt = parseInt(orgId, 10)
    if (code && orgIdInt && Number.isFinite(orgIdInt)) {
      const landing = new URL(returnTo, req.url).toString()
      await fetch(`${getAPIUrl()}affiliates/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgIdInt, code, landing_url: landing }),
      })
    }
  } catch {}

  const res = NextResponse.redirect(new URL(returnTo, req.url))

  if (code) {
    const value = orgId ? `${orgId}:${code}` : code
    res.cookies.set({
      name: 'nexo_affiliate_code',
      value,
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }

  return res
}

