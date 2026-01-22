'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getDefaultOrg } from '@services/config/config'
import { verifyStripeCheckoutSession } from '@services/payments/products'

export default function StripeCheckoutReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const session = useLHSession() as any

  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'canceled'>('processing')
  const [message, setMessage] = useState<string>('Verifying payment…')

  useEffect(() => {
    const run = async () => {
      const orgIdRaw = searchParams.get('org_id') || searchParams.get('orgId')
      const sessionId = searchParams.get('session_id')
      const paymentUserIdRaw = searchParams.get('payment_user_id')
      const canceled = searchParams.get('canceled') === '1'
      const returnTo = searchParams.get('return_to') || '/courses'
      const orgslug = searchParams.get('orgslug') || getDefaultOrg()

      if (canceled) {
        setStatus('canceled')
        setMessage('Checkout canceled. Returning…')
        setTimeout(() => router.replace(returnTo), 800)
        return
      }

      const paymentUserId = paymentUserIdRaw ? parseInt(paymentUserIdRaw, 10) : undefined
      const sessionIdLooksPlaceholder =
        !sessionId || sessionId === '{CHECKOUT_SESSION_ID}' || sessionId.includes('CHECKOUT_SESSION_ID')

      if (!orgIdRaw || (sessionIdLooksPlaceholder && !(typeof paymentUserId === 'number' && Number.isFinite(paymentUserId)))) {
        setStatus('error')
        setMessage('Missing checkout parameters.')
        return
      }

      const orgId = parseInt(orgIdRaw, 10)
      if (!Number.isFinite(orgId)) {
        setStatus('error')
        setMessage('Invalid org id.')
        return
      }

      const accessToken = session?.data?.tokens?.access_token
      if (!accessToken) {
        // Redirect user to login so they can verify the purchase
        router.replace(`/login?orgslug=${encodeURIComponent(orgslug)}`)
        return
      }

      try {
        const res = await verifyStripeCheckoutSession(
          orgId,
          sessionIdLooksPlaceholder ? null : sessionId,
          accessToken,
          typeof paymentUserId === 'number' && Number.isFinite(paymentUserId) ? paymentUserId : null
        )
        if (res.success) {
          setStatus('success')
          setMessage('Payment confirmed. Redirecting…')
          toast.success('Payment confirmed.')
          setTimeout(() => router.replace(returnTo), 800)
        } else {
          const detail = res?.data?.detail || res?.data?.message
          setStatus('error')
          setMessage(detail ? String(detail) : 'Payment not confirmed yet.')
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to verify payment'
        setStatus('error')
        setMessage(msg)
      }
    }

    run()
  }, [router, searchParams, session?.data?.tokens?.access_token])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f8f8] px-6">
      <div className="bg-white rounded-xl nice-shadow p-8 max-w-md w-full">
        <div className="text-lg font-bold mb-2">
          {status === 'processing' && 'Processing…'}
          {status === 'success' && 'Success'}
          {status === 'canceled' && 'Canceled'}
          {status === 'error' && 'Error'}
        </div>
        <div className="text-sm text-gray-600">{message}</div>
      </div>
    </div>
  )
}

