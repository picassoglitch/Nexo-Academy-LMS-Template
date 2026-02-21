'use client'
import nexoIcon from 'public/learnhouse_bigicon_1.png'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import Image from 'next/image'
import * as Form from '@radix-ui/react-form'
import { useFormik } from 'formik'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from "next-auth/react"
import { getUriWithOrg } from '@services/config/config'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'

interface LoginClientProps {
  org: any
}

const LoginClient = (props: LoginClientProps) => {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const router = useRouter();
  const searchParams = useSearchParams();

  const validate = (values: any) => {
    const errors: any = {}
    if (!values.password) {
      errors.password = t('validation.required')
    }
    return errors
  }

  const [error, setError] = React.useState('')
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validate,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { validateForm, setErrors }) => {
      setIsSubmitting(true)
      setError('')
      const errors = await validateForm(values)
      if (Object.keys(errors).length > 0) {
        setErrors(errors)
        setIsSubmitting(false)
        return
      }
      const callbackUrl =
        searchParams?.get('callbackUrl') ||
        searchParams?.get('return_to') ||
        '/redirect_from_auth'
      const loginEmail = values.email.trim() || '__site_login__'
      const res = await signIn('credentials', {
        redirect: false,
        email: loginEmail,
        password: values.password,
        callbackUrl,
      })
      if (res && res.error) {
        setError(t('auth.wrong_email_password'))
        setIsSubmitting(false)
      } else {
        router.push(callbackUrl)
      }
    },
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 px-12 py-10"
        style={{
          background: 'linear-gradient(160deg, #0a0a0a 0%, #111008 60%, #0a0a0a 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <Link prefetch href={getUriWithOrg(props.org.slug, '/')}>
            <Image quality={100} width={36} height={36} src={nexoIcon} alt="Nexo" />
          </Link>
          <span className="text-xs tracking-[0.25em] uppercase text-[#c9a84c] font-semibold">
            Nexo Academy
          </span>
        </div>

        {/* Center content */}
        <div className="flex flex-col space-y-6">
          {/* Gold line decoration */}
          <div className="w-10 h-0.5 bg-gradient-to-r from-[#c9a84c] to-transparent" />

          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#c9a84c]/70 mb-3">
              {t('auth.login_to')}
            </p>
            <div className="flex items-center space-x-4">
              {props.org?.logo_image ? (
                <img
                  src={`${getOrgLogoMediaDirectory(props.org.org_uuid, props.org?.logo_image)}`}
                  alt={props.org?.name}
                  style={{ width: 'auto', height: 52 }}
                  className="rounded-lg"
                />
              ) : (
                <Image quality={100} width={52} height={52} src={nexoIcon} alt="" />
              )}
              <h2 className="text-2xl font-bold text-[#ede8d8] tracking-tight">{props.org?.name}</h2>
            </div>
          </div>

          <p className="text-sm text-[#ede8d8]/30 leading-relaxed max-w-xs">
            Exclusive access to elite AI knowledge and strategies.
          </p>
        </div>

        {/* Bottom mark */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#ede8d8]/15">
            Nexo Academy — Restricted Access
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center space-x-2 mb-10">
          <Image quality={100} width={28} height={28} src={nexoIcon} alt="Nexo" />
          <span className="text-xs tracking-[0.25em] uppercase text-[#c9a84c]">Nexo Academy</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#c9a84c]">Secure Login</span>
            </div>
            <h1 className="text-2xl font-bold text-[#ede8d8] tracking-tight">{t('auth.login')}</h1>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-950/50 border border-red-800/40 rounded-lg px-4 py-3 mb-5">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <FormLayout onSubmit={formik.handleSubmit}>
            <div className="space-y-5">
              <FormField name="email">
                <FormLabelAndMessage
                  label={t('auth.email')}
                  message={formik.errors.email}
                />
                <Form.Control asChild>
                  <Input
                    onChange={formik.handleChange}
                    value={formik.values.email}
                    type="email"
                    placeholder="Optional — leave empty for quick access"
                  />
                </Form.Control>
              </FormField>

              <FormField name="password">
                <FormLabelAndMessage
                  label={t('auth.password')}
                  message={formik.errors.password}
                />
                <Form.Control asChild>
                  <Input
                    onChange={formik.handleChange}
                    value={formik.values.password}
                    type="password"
                    placeholder=""
                  />
                </Form.Control>
              </FormField>
            </div>

            <div className="mt-7">
              <Form.Submit asChild>
                <button
                  className="w-full py-2.5 rounded-lg font-semibold text-sm tracking-wide transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #c9a84c 0%, #a8863a 100%)',
                    color: '#0a0a0a',
                    boxShadow: '0 0 20px rgba(201,168,76,0.2)',
                  }}
                >
                  {isSubmitting ? t('common.loading') : t('auth.login')}
                </button>
              </Form.Submit>
            </div>
          </FormLayout>
        </div>
      </div>
    </div>
  )
}

export default LoginClient
