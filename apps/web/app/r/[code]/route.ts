import { NextRequest, NextResponse } from 'next/server'

/**
 * Affiliate redirect:
 *   /r/:code?org_id=123&return_to=/signup?orgslug=defaultorg
 *
 * Sets a cookie so signup/checkout can attribute the user.
 */
export function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = (params.code || '').trim()
  const orgId = req.nextUrl.searchParams.get('org_id') || ''
  const returnTo = req.nextUrl.searchParams.get('return_to') || '/'

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

