'use client'

import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import BreadCrumbs from '@components/Dashboard/Misc/BreadCrumbs'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import AdminAuthorization from '@components/Security/AdminAuthorization'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import {
  createAffiliate,
  generateAffiliateCode,
  getAffiliateAdminStats,
  getAffiliateProgram,
  updateAffiliateProgram,
  type AffiliateProgram,
} from '@services/affiliates/affiliates'

type AffiliateStat = {
  affiliate_id: number
  clicks: number
  signups: number
  pending_amount_cents: number
  paid_amount_cents: number
  currency: string
}

function formatMoney(cents: number, currency: string) {
  const value = (Number(cents || 0) / 100).toFixed(2)
  return `${value} ${currency || 'USD'}`
}

export default function AffiliatesAdminPage() {
  const org = useOrg() as any
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token as string | undefined
  const orgId = org?.id as number | undefined
  const orgSlug = org?.slug as string | undefined

  const [createOpen, setCreateOpen] = useState(false)
  const [newAffiliateName, setNewAffiliateName] = useState('')
  const [newAffiliateEmail, setNewAffiliateEmail] = useState('')

  const { data: programRes, mutate: mutateProgram } = useSWR(
    () => (orgId ? ['aff-program', orgId] : null),
    () => getAffiliateProgram(orgId!, accessToken)
  )
  const program = (programRes?.data as AffiliateProgram) || null

  const { data: statsRes, mutate: mutateStats } = useSWR(
    () => (orgId && accessToken ? ['aff-stats', orgId, accessToken] : null),
    () => getAffiliateAdminStats(orgId!, accessToken!)
  )

  const stats = (statsRes?.data as AffiliateStat[]) || []

  const shareBase = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.origin
    return ''
  }, [])

  async function saveProgram(next: Partial<AffiliateProgram>) {
    if (!orgId || !accessToken) return
    const res = await updateAffiliateProgram(orgId, next, accessToken)
    if (res.success) {
      toast.success('Affiliate program updated')
      await mutateProgram()
    } else {
      toast.error(String(res.data?.detail || res.data?.message || 'Failed to update'))
    }
  }

  async function onCreateAffiliate() {
    if (!orgId || !accessToken) return
    const name = newAffiliateName.trim()
    const email = newAffiliateEmail.trim().toLowerCase()
    if (!name || !email) {
      toast.error('Name and email are required')
      return
    }
    const res = await createAffiliate(orgId, { name, email }, accessToken)
    if (res.success) {
      toast.success('Affiliate created')
      setCreateOpen(false)
      setNewAffiliateName('')
      setNewAffiliateEmail('')
      await mutateStats()
    } else {
      toast.error(String(res.data?.detail || res.data?.message || 'Failed to create affiliate'))
    }
  }

  async function onGenerateCode(affiliateId: number) {
    if (!orgId || !accessToken) return
    const res = await generateAffiliateCode(orgId, affiliateId, accessToken)
    if (res.success) {
      const code = res.data?.code as string
      const link =
        shareBase && orgSlug
          ? `${shareBase}/r/${encodeURIComponent(code)}?org_id=${orgId}&return_to=${encodeURIComponent(
              `/signup?orgslug=${orgSlug}`
            )}`
          : code
      toast.success('Affiliate code generated')
      try {
        await navigator.clipboard.writeText(link)
        toast.success('Link copied to clipboard')
      } catch {}
    } else {
      toast.error(String(res.data?.detail || res.data?.message || 'Failed to generate code'))
    }
  }

  return (
    <AdminAuthorization authorizationMode="component">
      <div className="h-screen w-full bg-[#f8f8f8] flex flex-col">
        <div className="pl-10 pr-10 tracking-tight bg-[#fcfbfc] z-10 nice-shadow flex-shrink-0">
          <BreadCrumbs type="affiliates" />
          <div className="my-2 py-2">
            <div className="w-100 flex flex-col space-y-1">
              <div className="pt-3 flex font-bold text-4xl tracking-tighter">Affiliates</div>
              <div className="flex font-medium text-gray-400 text-md">
                Manage affiliate tracking and commissions
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-6">
          <div className="bg-white rounded-xl nice-shadow p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">Program settings</div>
                <div className="text-sm text-gray-500">
                  Defaults: 30 days, last-click. Subscriptions: 50% for first 6 cycles, then 20%. One-time: 30%.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={program?.enabled ? 'default' : 'secondary'}
                  onClick={() => saveProgram({ enabled: !program?.enabled })}
                  disabled={!program}
                >
                  {program?.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>

            {program && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Attribution window (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={program.attribution_window_days}
                    onChange={(e) => saveProgram({ attribution_window_days: Number(e.target.value || 30) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attribution model</Label>
                  <Select
                    value={program.attribution_model}
                    onValueChange={(v) => saveProgram({ attribution_model: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_click">Last click</SelectItem>
                      <SelectItem value="first_click">First click</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subscription first cycles</Label>
                  <Input
                    type="number"
                    min={1}
                    value={program.subscription_first_cycles}
                    onChange={(e) => saveProgram({ subscription_first_cycles: Number(e.target.value || 6) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>One-time rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={program.one_time_rate}
                    onChange={(e) => saveProgram({ one_time_rate: Number(e.target.value || 0.3) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subscription first rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={program.subscription_first_rate}
                    onChange={(e) => saveProgram({ subscription_first_rate: Number(e.target.value || 0.5) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subscription recurring rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={program.subscription_recurring_rate}
                    onChange={(e) => saveProgram({ subscription_recurring_rate: Number(e.target.value || 0.2) })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl nice-shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">Affiliates</div>
                <div className="text-sm text-gray-500">Create affiliates, generate codes, and track results.</div>
              </div>
              <Button onClick={() => setCreateOpen(true)}>New affiliate</Button>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Affiliate ID</th>
                    <th className="py-2 pr-3">Clicks</th>
                    <th className="py-2 pr-3">Signups</th>
                    <th className="py-2 pr-3">Pending</th>
                    <th className="py-2 pr-3">Paid</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.affiliate_id} className="border-b last:border-0">
                      <td className="py-3 pr-3 font-mono">{s.affiliate_id}</td>
                      <td className="py-3 pr-3">{s.clicks}</td>
                      <td className="py-3 pr-3">{s.signups}</td>
                      <td className="py-3 pr-3">{formatMoney(s.pending_amount_cents, s.currency)}</td>
                      <td className="py-3 pr-3">{formatMoney(s.paid_amount_cents, s.currency)}</td>
                      <td className="py-3 pr-3 text-right">
                        <Button variant="secondary" onClick={() => onGenerateCode(s.affiliate_id)}>
                          Generate link
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td className="py-4 text-gray-500" colSpan={6}>
                        No affiliates yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Modal
          isDialogOpen={createOpen}
          onOpenChange={setCreateOpen}
          minHeight="no-min"
          dialogTitle="Create affiliate"
          dialogDescription="Create an affiliate and then generate a link/code."
          dialogContent={
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newAffiliateName} onChange={(e) => setNewAffiliateName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={newAffiliateEmail} onChange={(e) => setNewAffiliateEmail(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={onCreateAffiliate}>Create</Button>
              </div>
            </div>
          }
        />
      </div>
    </AdminAuthorization>
  )
}

