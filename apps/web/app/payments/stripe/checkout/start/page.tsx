'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getStripeProductCheckoutSession } from '@services/payments/products'
import { getDefaultOrg } from '@services/config/config'

export default function StripeCheckoutStartPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const session = useLHSession() as any

  const [message, setMessage] = useState('Preparing checkout…')

  useEffect(() => {
    const run = async () => {
      const orgIdRaw = searchParams.get('org_id') || searchParams.get('orgId')
      const productIdRaw = searchParams.get('product_id') || searchParams.get('productId')
      const orgslug = searchParams.get('orgslug') || getDefaultOrg()
      const returnTo = searchParams.get('return_to') || '/'

      const orgId = orgIdRaw ? parseInt(orgIdRaw, 10) : NaN
      const productId = productIdRaw ? parseInt(productIdRaw, 10) : NaN

      if (!Number.isFinite(orgId) || !Number.isFinite(productId)) {
        setMessage('Missing org_id or product_id.')
        return
      }

      const accessToken = session?.data?.tokens?.access_token as string | undefined
      if (!accessToken) {
        // Send user to login, then back to this page with the same parameters.
        const callbackUrl = new URL('/payments/stripe/checkout/start', window.location.origin)
        callbackUrl.searchParams.set('org_id', String(orgId))
        callbackUrl.searchParams.set('product_id', String(productId))
        callbackUrl.searchParams.set('orgslug', orgslug)
        callbackUrl.searchParams.set('return_to', returnTo)

        router.replace(
          `/login?orgslug=${encodeURIComponent(orgslug)}&callbackUrl=${encodeURIComponent(
            callbackUrl.pathname + callbackUrl.search
          )}`
        )
        return
      }

      try {
        setMessage('Redirecting to Stripe Checkout…')
        const redirectUri = new URL('/payments/stripe/checkout/return', window.location.origin)
        redirectUri.searchParams.set('org_id', String(orgId))
        redirectUri.searchParams.set('orgslug', orgslug)
        redirectUri.searchParams.set('return_to', returnTo)

        const res = await getStripeProductCheckoutSession(orgId, productId, redirectUri.toString(), accessToken)
        if (res.success && res.data?.checkout_url) {
          window.location.href = res.data.checkout_url
          return
        }
        const detail = res?.data?.detail || res?.data?.message
        toast.error(detail ? String(detail) : 'Failed to start checkout')
        setMessage(detail ? String(detail) : 'Failed to start checkout')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to start checkout'
        toast.error(msg)
        setMessage(msg)
      }
    }

    run()
  }, [router, searchParams, session?.data?.tokens?.access_token])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f8f8] px-6">
      <div className="bg-white rounded-xl nice-shadow p-8 max-w-md w-full">
        <div className="text-lg font-bold mb-2">Checkout</div>
        <div className="text-sm text-gray-600">{message}</div>
      </div>
    </div>
  )
}

