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
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { useLHSession } from '@components/Contexts/LHSessionContext'
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
  const session = useLHSession() as any;

  const validate = (values: any) => {
    const errors: any = {}
    if (!values.password) {
      errors.password = t('validation.required')
    }
    // Email is optional - if provided, uses DB user login; if empty, uses password-only access
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
    onSubmit: async (values, { validateForm, setErrors, setSubmitting }) => {
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
      // If email is provided, use DB user login; otherwise use password-only access
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
        // Successful login - redirect manually
        router.push(callbackUrl)
      }
    },
  })

  return (
    <div className="grid grid-flow-col justify-stretch h-screen">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <div
        className="right-login-part"
        style={{
          background:
            'linear-gradient(041.61deg, #202020 7.15%, #000000 90.96%)',
        }}
      >
        <div className="login-topbar m-10">
          <Link prefetch href={getUriWithOrg(props.org.slug, '/')}>
            <Image
              quality={100}
              width={30}
              height={30}
              src={nexoIcon}
              alt=""
            />
          </Link>
        </div>
        <div className="ml-10 h-4/6 flex flex-row text-white">
          <div className="m-auto flex space-x-4 items-center flex-wrap">
            <div>{t('auth.login_to')} </div>
            <div className="shadow-[0px_4px_16px_rgba(0,0,0,0.02)]">
              {props.org?.logo_image ? (
                <img
                  src={`${getOrgLogoMediaDirectory(
                    props.org.org_uuid,
                    props.org?.logo_image
                  )}`}
                  alt="Nexo Academy"
                  style={{ width: 'auto', height: 70 }}
                  className="rounded-xl shadow-xl inset-0 ring-1 ring-inset ring-black/10 bg-white"
                />
              ) : (
                <Image
                  quality={100}
                  width={70}
                  height={70}
                  src={nexoIcon}
                  alt=""
                />
              )}
            </div>
            <div className="font-bold text-xl">{props.org?.name}</div>
          </div>
        </div>
      </div>
      <div className="left-login-part bg-white flex flex-row">
        <div className="login-form m-auto w-72">
          {error && (
            <div className="flex justify-center bg-red-200 rounded-md text-red-950 space-x-2 items-center p-4 transition-all shadow-xs">
              <AlertTriangle size={18} />
              <div className="font-bold text-sm">{error}</div>
            </div>
          )}
          <FormLayout onSubmit={formik.handleSubmit}>
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
                  placeholder="Optional - leave empty for quick access"
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
            <div className="flex py-4">
              <Form.Submit asChild>
                <button className="w-full bg-black text-white font-bold text-center p-2 rounded-md shadow-md hover:cursor-pointer">
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
