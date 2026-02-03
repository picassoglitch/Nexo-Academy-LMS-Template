'use client'
import React, { useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { updateSitePasswords } from '@services/auth/auth'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { KeyRound } from 'lucide-react'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'

export default function SiteAccessPasswords() {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const [sitePassword, setSitePassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken) {
      toast.error(t('common.something_went_wrong'))
      return
    }
    if (!sitePassword.trim() && !adminPassword.trim()) {
      toast.error(t('dashboard.site_access.enter_at_least_one'))
      return
    }
    setSubmitting(true)
    const body: { site_password?: string; admin_password?: string } = {}
    if (sitePassword.trim()) body.site_password = sitePassword.trim()
    if (adminPassword.trim()) body.admin_password = adminPassword.trim()
    const res = await updateSitePasswords(accessToken, body)
    if (res.success) {
      toast.success(t('dashboard.site_access.updated'))
      setSitePassword('')
      setAdminPassword('')
    } else {
      toast.error(res?.detail || t('common.something_went_wrong'))
    }
    setSubmitting(false)
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={24} className="text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          {t('dashboard.site_access.title')}
        </h2>
      </div>
      <p className="text-gray-600 text-sm mb-6">
        {t('dashboard.site_access.description')}
      </p>
      <form onSubmit={handleSubmit}>
        <FormLayout onSubmit={handleSubmit}>
          <FormField name="site_password">
            <FormLabelAndMessage label={t('dashboard.site_access.site_password_label')} />
            <Form.Control asChild>
              <Input
                type="password"
                value={sitePassword}
                onChange={(e) => setSitePassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Form.Control>
          </FormField>
          <FormField name="admin_password">
            <FormLabelAndMessage label={t('dashboard.site_access.admin_password_label')} />
            <Form.Control asChild>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Form.Control>
          </FormField>
          <div className="mt-4">
            <Form.Submit asChild>
              <button
                type="submit"
                disabled={submitting || (!sitePassword.trim() && !adminPassword.trim())}
                className="px-4 py-2 bg-black text-white font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t('common.loading') : t('dashboard.site_access.update_button')}
              </button>
            </Form.Submit>
          </div>
        </FormLayout>
      </form>
    </div>
  )
}
