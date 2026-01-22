'use client'
import React from 'react'
import { Form, Formik } from 'formik'
import * as Yup from 'yup'
import {
  updateOrganization,
  updateOrganizationConfig,
  uploadOrganizationFavicon,
} from '@services/settings/org'
import { revalidateTags } from '@services/utils/ts/requests'
import { useRouter } from 'next/navigation'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { toast } from 'react-hot-toast'
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import { Button } from "@components/ui/button"
import { Label } from "@components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Switch } from "@components/ui/switch"
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import Image from 'next/image'
import learnhouseIcon from '@public/learnhouse_logo.png'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const ORG_LABELS = [
  { value: 'languages', label: '🌐 Languages' },
  { value: 'business', label: '💰 Business' },
  { value: 'ecommerce', label: '🛍 E-commerce' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'music', label: '🎸 Music' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'cars', label: '🚗 Cars' },
  { value: 'sales_marketing', label: '🚀 Sales & Marketing' },
  { value: 'tech', label: '💻 Tech' },
  { value: 'photo_video', label: '📸 Photo & Video' },
  { value: 'pets', label: '🐕 Pets' },
  { value: 'personal_development', label: '📚 Personal Development' },
  { value: 'real_estate', label: '🏠 Real Estate' },
  { value: 'beauty_fashion', label: '👠 Beauty & Fashion' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'productivity', label: '⏳ Productivity' },
  { value: 'health_fitness', label: '🍎 Health & Fitness' },
  { value: 'finance', label: '📈 Finance' },
  { value: 'arts_crafts', label: '🎨 Arts & Crafts' },
  { value: 'education', label: '📚 Education' },
  { value: 'stem', label: '🔬 STEM' },
  { value: 'humanities', label: '📖 Humanities' },
  { value: 'professional_skills', label: '💼 Professional Skills' },
  { value: 'digital_skills', label: '💻 Digital Skills' },
  { value: 'creative_arts', label: '🎨 Creative Arts' },
  { value: 'social_sciences', label: '🌍 Social Sciences' },
  { value: 'test_prep', label: '✍️ Test Preparation' },
  { value: 'vocational', label: '🔧 Vocational Training' },
  { value: 'early_education', label: '🎯 Early Education' },
] as const

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .max(60, 'Organization name must be 60 characters or less'),
  description: Yup.string()
    .required('Short description is required')
    .max(100, 'Short description must be 100 characters or less'),
  about: Yup.string()
    .optional()
    .max(400, 'About text must be 400 characters or less'),
  label: Yup.string().required('Organization label is required'),
  explore: Yup.boolean(),
  tab_title: Yup.string().optional().max(80, 'Tab title must be 80 characters or less'),
  favicon_url: Yup.string().optional().max(500, 'Favicon URL is too long'),
  favicon_emoji: Yup.string().optional().max(8, 'Favicon emoji is too long'),
})

interface OrganizationValues {
  name: string
  description: string
  about: string
  label: string
  explore: boolean
  tab_title: string
  favicon_url: string
  favicon_emoji: string
}

const OrgEditGeneral: React.FC = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const org = useOrg() as any
  const [isFaviconUploading, setIsFaviconUploading] = React.useState(false)

  const initialValues: OrganizationValues = {
    name: org?.name,
    description: org?.description || '',
    about: org?.about || '',
    label: org?.label || '',
    explore: org?.explore ?? false,
    tab_title: org?.config?.config?.general?.tab_title || '',
    favicon_url: org?.config?.config?.general?.favicon_url || '',
    favicon_emoji: org?.config?.config?.general?.favicon_emoji || '',
  }

  const updateOrg = async (values: OrganizationValues) => {
    const loadingToast = toast.loading(t('dashboard.organization.settings.updating'))
    try {
      // 1) Update core org fields
      await updateOrganization(
        org.id,
        {
          name: values.name,
          description: values.description,
          about: values.about,
          label: values.label,
          explore: values.explore,
        },
        access_token
      )

      // 2) Update org config (browser tab branding)
      const nextConfig = JSON.parse(JSON.stringify(org?.config?.config || {}))
      nextConfig.general = nextConfig.general || {}
      nextConfig.general.tab_title = values.tab_title?.trim() || null
      nextConfig.general.favicon_url = values.favicon_url?.trim() || null
      nextConfig.general.favicon_emoji = values.favicon_emoji?.trim() || null
      await updateOrganizationConfig(org.id, nextConfig, access_token)

      await revalidateTags(['organizations'], org.slug)
      mutate(`${getAPIUrl()}orgs/slug/${org.slug}`)
      toast.success(t('dashboard.organization.settings.update_success'), { id: loadingToast })
    } catch (err) {
      toast.error(t('dashboard.organization.settings.update_error'), { id: loadingToast })
    }
  }

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return
    const file = event.target.files[0]
    // allow re-uploading same file
    event.target.value = ''

    if (!access_token) return

    setIsFaviconUploading(true)
    const loadingToast = toast.loading('Uploading tab icon…')
    try {
      await uploadOrganizationFavicon(org.id, file, access_token)
      await revalidateTags(['organizations'], org.slug)
      mutate(`${getAPIUrl()}orgs/slug/${org.slug}`)
      toast.success('Tab icon updated.', { id: loadingToast })
    } catch (err) {
      toast.error('Failed to upload tab icon.', { id: loadingToast })
    } finally {
      setIsFaviconUploading(false)
    }
  }

  return (
    <div className="sm:mx-10 mx-0 bg-white rounded-xl nice-shadow ">
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values, { setSubmitting }) => {
          setTimeout(() => {
            setSubmitting(false)
            updateOrg(values)
          }, 400)
        }}
      >
        {({ isSubmitting, values, handleChange, errors, touched, setFieldValue }) => (
          <Form>
            <div className="flex flex-col gap-0">
              <div className="flex flex-col bg-gray-50 -space-y-1 px-5 py-3 mx-3 my-3 rounded-md">
                <h1 className="font-bold text-xl text-gray-800">
                  {t('dashboard.organization.settings.title')}
                </h1>
                <h2 className="text-gray-500 text-md">
                  {t('dashboard.organization.settings.subtitle')}
                </h2>
              </div>

              <div className="flex flex-col lg:flex-row lg:space-x-8 mt-0 mx-5 my-5">
                <div className="w-full space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">
                        {t('dashboard.organization.settings.name')}
                        <span className="text-gray-500 text-sm ml-2">
                          ({60 - (values.name?.length || 0)} characters left)
                        </span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        placeholder={t('dashboard.organization.settings.name_placeholder')}
                        maxLength={60}
                      />
                      {touched.name && errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description">
                        {t('dashboard.organization.settings.short_description')}
                        <span className="text-gray-500 text-sm ml-2">
                          ({100 - (values.description?.length || 0)} characters left)
                        </span>
                      </Label>
                      <Input
                        id="description"
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        placeholder={t('dashboard.organization.settings.short_description_placeholder')}
                        maxLength={100}
                      />
                      {touched.description && errors.description && (
                        <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="label">{t('dashboard.organization.settings.label')}</Label>
                      <Select
                        value={values.label}
                        onValueChange={(value) => setFieldValue('label', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('dashboard.organization.settings.label_placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {ORG_LABELS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {touched.label && errors.label && (
                        <p className="text-red-500 text-sm mt-1">{errors.label}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="about">
                        {t('dashboard.organization.settings.about')}
                        <span className="text-gray-500 text-sm ml-2">
                          ({400 - (values.about?.length || 0)} characters left)
                        </span>
                      </Label>
                      <Textarea
                        id="about"
                        name="about"
                        value={values.about}
                        onChange={handleChange}
                        placeholder={t('dashboard.organization.settings.about_placeholder')}
                        className="min-h-[250px]"
                        maxLength={400}
                      />
                      {touched.about && errors.about && (
                        <p className="text-red-500 text-sm mt-1">{errors.about}</p>
                      )}
                    </div>

                    

                    <div className="space-y-3 mt-6 bg-gray-50/50 p-4 rounded-lg nice-shadow">
                      <div className="flex flex-col">
                        <div className="font-semibold text-gray-800">Browser tab branding</div>
                        <div className="text-sm text-gray-500">
                          Controls the tab title and icon for your organization dashboard.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="tab_title">Tab title</Label>
                          <Input
                            id="tab_title"
                            name="tab_title"
                            value={values.tab_title}
                            onChange={handleChange}
                            placeholder="e.g. NEXO Admin"
                            maxLength={80}
                          />
                          {touched.tab_title && (errors as any).tab_title && (
                            <p className="text-red-500 text-sm mt-1">{(errors as any).tab_title}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="favicon_emoji">Tab icon (emoji)</Label>
                          <Input
                            id="favicon_emoji"
                            name="favicon_emoji"
                            value={values.favicon_emoji}
                            onChange={handleChange}
                            placeholder="e.g. 🚀"
                            maxLength={8}
                          />
                          {touched.favicon_emoji && (errors as any).favicon_emoji && (
                            <p className="text-red-500 text-sm mt-1">{(errors as any).favicon_emoji}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="favicon_url">Tab icon (image URL)</Label>
                        <Input
                          id="favicon_url"
                          name="favicon_url"
                          value={values.favicon_url}
                          onChange={handleChange}
                          placeholder="e.g. https://yourdomain.com/favicon.png"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          If set, the URL takes priority over the uploaded image and emoji.
                        </div>
                        {touched.favicon_url && (errors as any).favicon_url && (
                          <p className="text-red-500 text-sm mt-1">{(errors as any).favicon_url}</p>
                        )}
                      </div>

                      <div className="pt-2">
                        <Label htmlFor="favicon_upload">Or upload a small icon</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <Input
                            id="favicon_upload"
                            name="favicon_upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFaviconUpload}
                            disabled={isFaviconUploading}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled
                            className="shrink-0"
                          >
                            {isFaviconUploading ? 'Uploading…' : 'Upload'}
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Recommended: square PNG (64×64 or 128×128), under 2MB.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between space-x-2 mt-6 bg-gray-50/50 p-4 rounded-lg nice-shadow">
                      <div className="flex items-center space-x-4">
                        <Link href="https://www.learnhouse.app/explore" target="_blank" className="flex items-center space-x-2">
                          <Image
                            quality={100}
                            width={120}
                            src={learnhouseIcon}
                            alt="LearnHouse"
                            className="rounded-lg"
                          />
                          <span className="px-2 py-1 mt-1 bg-black rounded-md text-[10px] font-semibold text-white">
                            EXPLORE
                          </span>
                        </Link>
                        <div className="space-y-0.5">
                          <Label className="text-base">{t('dashboard.organization.settings.showcase_explore')}</Label>
                          <p className="text-sm text-gray-500">
                            {t('dashboard.organization.settings.showcase_description')}
                          </p>
                        </div>
                      </div>
                      <Switch
                        name="explore"
                        checked={values.explore ?? false}
                        onCheckedChange={(checked) => setFieldValue('explore', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-row-reverse mt-0 mx-5 mb-5">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-black text-white hover:bg-black/90"
                >
                  {isSubmitting ? t('dashboard.organization.settings.saving') : t('dashboard.organization.settings.save_changes')}
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default OrgEditGeneral
