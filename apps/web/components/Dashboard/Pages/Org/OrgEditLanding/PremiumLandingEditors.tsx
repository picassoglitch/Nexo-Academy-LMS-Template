'use client'

import React from 'react'
import {
  LandingAboutSection,
  LandingAccentColorKey,
  LandingColoredTextSegment,
  LandingCommunitySection,
  LandingFaqSection,
  LandingFinalCtaSection,
  LandingFooterSection,
  LandingHeroLeadMagnetSection,
  LandingHowItWorksSection,
  LandingPricingSection,
  LandingTestimonialsGridSection,
  LandingTrustSection,
} from './landing_types'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import { Textarea } from '@components/ui/textarea'
import { Plus, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { uploadLandingContent } from '@services/organizations/orgs'
import { getOrgLandingMediaDirectory } from '@services/media/media'
import { getAcceptValue, validateFile } from '@/lib/file-validation'
import useSWR from 'swr'
import { getProducts } from '@services/payments/products'

const ColorKeySelect = ({
  value,
  onChange,
}: {
  value?: LandingAccentColorKey
  onChange: (v: LandingAccentColorKey) => void
}) => (
  <Select value={value || 'neutral'} onValueChange={(v) => onChange(v as LandingAccentColorKey)}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Color" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="neutral">Neutral</SelectItem>
      <SelectItem value="blue">Azul</SelectItem>
      <SelectItem value="orange">Naranja</SelectItem>
      <SelectItem value="green">Verde</SelectItem>
      <SelectItem value="purple">Morado</SelectItem>
    </SelectContent>
  </Select>
)

const ReorderButtons = ({ onUp, onDown }: { onUp: () => void; onDown: () => void }) => (
  <div className="flex gap-2">
    <Button type="button" variant="outline" size="sm" onClick={onUp}>
      ↑
    </Button>
    <Button type="button" variant="outline" size="sm" onClick={onDown}>
      ↓
    </Button>
  </div>
)

export const StringListEditor = ({
  label,
  items,
  onChange,
  addLabel = 'Add',
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  addLabel?: string
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...(items || []), ''])}>
        <Plus className="h-4 w-4 mr-2" />
        {addLabel}
      </Button>
    </div>
    <div className="space-y-2">
      {(items || []).map((v, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            value={v}
            onChange={(e) => {
              const next = [...items]
              next[idx] = e.target.value
              onChange(next)
            }}
          />
          <ReorderButtons
            onUp={() => {
              if (idx === 0) return
              const next = [...items]
              ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
              onChange(next)
            }}
            onDown={() => {
              if (idx >= items.length - 1) return
              const next = [...items]
              ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
              onChange(next)
            }}
          />
          <Button type="button" variant="destructive" size="sm" onClick={() => onChange(items.filter((_, i) => i !== idx))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  </div>
)

const ColoredTextSegmentsEditor = ({
  label,
  segments,
  onChange,
}: {
  label: string
  segments: LandingColoredTextSegment[]
  onChange: (segments: LandingColoredTextSegment[]) => void
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...(segments || []), { text: '', colorKey: 'neutral' }])}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </div>
    <div className="space-y-2">
      {(segments || []).map((seg, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
          <div className="md:col-span-4">
            <Input
              value={seg.text}
              onChange={(e) => {
                const next = [...segments]
                next[idx] = { ...seg, text: e.target.value }
                onChange(next)
              }}
              placeholder="Text"
            />
          </div>
          <div className="md:col-span-1">
            <ColorKeySelect
              value={seg.colorKey}
              onChange={(v) => {
                const next = [...segments]
                next[idx] = { ...seg, colorKey: v }
                onChange(next)
              }}
            />
          </div>
          <div className="md:col-span-1 flex gap-2 justify-end">
            <ReorderButtons
              onUp={() => {
                if (idx === 0) return
                const next = [...segments]
                ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                onChange(next)
              }}
              onDown={() => {
                if (idx >= segments.length - 1) return
                const next = [...segments]
                ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                onChange(next)
              }}
            />
            <Button type="button" variant="destructive" size="sm" onClick={() => onChange(segments.filter((_, i) => i !== idx))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const HeroLeadMagnetEditor = ({
  section,
  onChange,
}: {
  section: LandingHeroLeadMagnetSection
  onChange: (s: LandingHeroLeadMagnetSection) => void
}) => {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [isUploading, setIsUploading] = React.useState(false)
  const inputId = `heroVideoUpload-${section.id || 'inicio'}`

  const onUpload = async (file: File) => {
    if (!access_token) {
      toast.error('Necesitas iniciar sesión para subir un video.')
      return
    }

    const validation = validateFile(file, ['video'])
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    setIsUploading(true)
    try {
      const response: any = await uploadLandingContent(org.id, file, access_token)
      if (response?.status === 200) {
        const url = getOrgLandingMediaDirectory(org.org_uuid, response.data.filename)
        onChange({ ...section, videoUrl: url })
        toast.success('Video subido correctamente.')
      } else {
        toast.error('No se pudo subir el video. Intenta de nuevo.')
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo subir el video. Intenta de nuevo.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
      <h3 className="font-semibold text-lg">Hero + Video</h3>
      <div className="space-y-4">
        <div>
          <Label>Anchor ID</Label>
          <Input value={section.id || ''} onChange={(e) => onChange({ ...section, id: e.target.value })} placeholder="inicio" />
        </div>
        <ColoredTextSegmentsEditor label="Headline segments" segments={section.headline} onChange={(headline) => onChange({ ...section, headline })} />
        <div>
          <Label>Subtitle</Label>
          <Textarea value={section.subtitle} onChange={(e) => onChange({ ...section, subtitle: e.target.value })} />
        </div>

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold">Video Card</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Badge</Label>
              <Input
                value={section.videoCard?.badgeText || ''}
                onChange={(e) =>
                  onChange({ ...section, videoCard: { ...section.videoCard, badgeText: e.target.value } })
                }
                placeholder="Video de 3 minutos"
              />
              <Label>Título</Label>
              <Input
                value={section.videoCard?.title || ''}
                onChange={(e) =>
                  onChange({ ...section, videoCard: { ...section.videoCard, title: e.target.value } })
                }
                placeholder="¿Listo para generar ingresos reales con IA?"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Textarea
                value={section.videoCard?.subtitle || ''}
                onChange={(e) =>
                  onChange({ ...section, videoCard: { ...section.videoCard, subtitle: e.target.value } })
                }
                className="min-h-[90px]"
                placeholder="Mira este video de 3 minutos..."
              />
              <Label>CTA debajo del video</Label>
              <Input
                value={section.videoCard?.ctaLabel || ''}
                onChange={(e) =>
                  onChange({ ...section, videoCard: { ...section.videoCard, ctaLabel: e.target.value } })
                }
                placeholder="Empieza a ganar dinero ahora"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Video URL (embed o archivo subido)</Label>
            <Input
              value={section.videoUrl || ''}
              onChange={(e) => onChange({ ...section, videoUrl: e.target.value })}
              placeholder="https://www.youtube.com/embed/ABC123"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(inputId)?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Subiendo…' : 'Subir video (MP4/WebM)'}
              </Button>
              <input
                id={inputId}
                type="file"
                accept={getAcceptValue(['video'])}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  await onUpload(file)
                }}
              />
              <div className="text-xs text-gray-500 self-center">
                YouTube/Vimeo: usa URL de <strong>embed</strong>. O sube un MP4/WebM directo.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary CTA Label</Label>
            <Input value={section.primaryCta.label} onChange={(e) => onChange({ ...section, primaryCta: { ...section.primaryCta, label: e.target.value } })} />
            <Label>Primary CTA Href</Label>
            <Input value={section.primaryCta.href} onChange={(e) => onChange({ ...section, primaryCta: { ...section.primaryCta, href: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Secondary CTA Label</Label>
            <Input value={section.secondaryCta.label} onChange={(e) => onChange({ ...section, secondaryCta: { ...section.secondaryCta, label: e.target.value } })} />
            <Label>Secondary CTA Href</Label>
            <Input value={section.secondaryCta.href} onChange={(e) => onChange({ ...section, secondaryCta: { ...section.secondaryCta, href: e.target.value } })} />
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold">Lead Magnet Card (legacy)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={section.leadMagnet.title} onChange={(e) => onChange({ ...section, leadMagnet: { ...section.leadMagnet, title: e.target.value } })} />
              <Label>Subtitle</Label>
              <Input value={section.leadMagnet.subtitle} onChange={(e) => onChange({ ...section, leadMagnet: { ...section.leadMagnet, subtitle: e.target.value } })} />
              <Label>Badge</Label>
              <Input value={section.leadMagnet.badgeText} onChange={(e) => onChange({ ...section, leadMagnet: { ...section.leadMagnet, badgeText: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>Email placeholder</Label>
              <Input value={section.leadMagnet.emailPlaceholder} onChange={(e) => onChange({ ...section, leadMagnet: { ...section.leadMagnet, emailPlaceholder: e.target.value } })} />
              <Label>Button label</Label>
              <Input value={section.leadMagnet.buttonLabel} onChange={(e) => onChange({ ...section, leadMagnet: { ...section.leadMagnet, buttonLabel: e.target.value } })} />
              <Label>Microcopy</Label>
              <Input value={section.leadMagnet.microcopy} onChange={(e) => onChange({ ...section, leadMagnet: { ...section.leadMagnet, microcopy: e.target.value } })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const AboutEditor = ({
  section,
  onChange,
}: {
  section: LandingAboutSection
  onChange: (s: LandingAboutSection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">Quiénes Somos</h3>
    <div className="space-y-4">
      <Label>Anchor ID</Label>
      <Input value={section.id || ''} onChange={(e) => onChange({ ...section, id: e.target.value })} placeholder="quienes-somos" />
      <Label>Title</Label>
      <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <Label>Headline</Label>
      <Input value={section.headline} onChange={(e) => onChange({ ...section, headline: e.target.value })} />
      <StringListEditor label="Bullets" items={section.bullets} onChange={(bullets) => onChange({ ...section, bullets })} addLabel="Add bullet" />
      <Label>Video pill label</Label>
      <Input value={section.videoLabel} onChange={(e) => onChange({ ...section, videoLabel: e.target.value })} />
      <StringListEditor label="Body paragraphs" items={section.body} onChange={(body) => onChange({ ...section, body })} addLabel="Add paragraph" />
    </div>
  </div>
)

export const TestimonialsGridEditor = ({
  section,
  onChange,
}: {
  section: LandingTestimonialsGridSection
  onChange: (s: LandingTestimonialsGridSection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">Historias de Éxito</h3>
    <div className="space-y-4">
      <Label>Title</Label>
      <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <div className="flex items-center justify-between">
        <Label>Cards</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              items: [
                ...(section.items || []),
                { name: '', role: '', location: '', quote: '', metricLabel: '', metricValue: '', colorKey: 'neutral' },
              ],
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {(section.items || []).map((it, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Card {idx + 1}</div>
              <Button type="button" variant="destructive" size="sm" onClick={() => onChange({ ...section, items: section.items.filter((_, i) => i !== idx) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input placeholder="Name" value={it.name} onChange={(e) => {
                const next = [...section.items]; next[idx] = { ...it, name: e.target.value }; onChange({ ...section, items: next })
              }} />
              <Input placeholder="Role" value={it.role} onChange={(e) => {
                const next = [...section.items]; next[idx] = { ...it, role: e.target.value }; onChange({ ...section, items: next })
              }} />
              <Input placeholder="Location" value={it.location || ''} onChange={(e) => {
                const next = [...section.items]; next[idx] = { ...it, location: e.target.value }; onChange({ ...section, items: next })
              }} />
              <ColorKeySelect value={it.colorKey} onChange={(v) => {
                const next = [...section.items]; next[idx] = { ...it, colorKey: v }; onChange({ ...section, items: next })
              }} />
              <Input placeholder="Metric label" value={it.metricLabel} onChange={(e) => {
                const next = [...section.items]; next[idx] = { ...it, metricLabel: e.target.value }; onChange({ ...section, items: next })
              }} />
              <Input placeholder="Metric value" value={it.metricValue} onChange={(e) => {
                const next = [...section.items]; next[idx] = { ...it, metricValue: e.target.value }; onChange({ ...section, items: next })
              }} />
            </div>
            <Textarea placeholder="Quote" value={it.quote} onChange={(e) => {
              const next = [...section.items]; next[idx] = { ...it, quote: e.target.value }; onChange({ ...section, items: next })
            }} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const HowItWorksEditor = ({
  section,
  onChange,
}: {
  section: LandingHowItWorksSection
  onChange: (s: LandingHowItWorksSection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">Cómo Funciona</h3>
    <div className="space-y-4">
      <Label>Anchor ID</Label>
      <Input value={section.id || ''} onChange={(e) => onChange({ ...section, id: e.target.value })} placeholder="como-funciona" />
      <Label>Title</Label>
      <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <div className="flex items-center justify-between">
        <Label>Steps</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...section, steps: [...(section.steps || []), { title: '', body: '', iconKey: 'Sparkles', colorKey: 'neutral' }] })}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {(section.steps || []).map((st, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Step {idx + 1}</div>
              <Button type="button" variant="destructive" size="sm" onClick={() => onChange({ ...section, steps: section.steps.filter((_, i) => i !== idx) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input placeholder="Title" value={st.title} onChange={(e) => {
                const next = [...section.steps]; next[idx] = { ...st, title: e.target.value }; onChange({ ...section, steps: next })
              }} />
              <Input placeholder="Icon key" value={st.iconKey} onChange={(e) => {
                const next = [...section.steps]; next[idx] = { ...st, iconKey: e.target.value }; onChange({ ...section, steps: next })
              }} />
              <ColorKeySelect value={st.colorKey} onChange={(v) => {
                const next = [...section.steps]; next[idx] = { ...st, colorKey: v }; onChange({ ...section, steps: next })
              }} />
            </div>
            <Textarea placeholder="Body" value={st.body} onChange={(e) => {
              const next = [...section.steps]; next[idx] = { ...st, body: e.target.value }; onChange({ ...section, steps: next })
            }} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const PricingEditor = ({
  section,
  onChange,
}: {
  section: LandingPricingSection
  onChange: (s: LandingPricingSection) => void
}) => {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const { data: productsRes } = useSWR(
    () => (org && access_token ? [`/payments/${org.id}/products`, access_token] : null),
    ([, token]) => getProducts(org.id, token)
  )

  const products = (productsRes as any)?.data || []

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
      <h3 className="font-semibold text-lg">Pricing</h3>
      <div className="space-y-4">
      <Label>Anchor ID</Label>
      <Input value={section.id || ''} onChange={(e) => onChange({ ...section, id: e.target.value })} placeholder="precios" />
      <Label>Title</Label>
      <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <Label>Subtitle</Label>
      <Input value={section.subtitle} onChange={(e) => onChange({ ...section, subtitle: e.target.value })} />
      <StringListEditor label="Footer highlights" items={section.footerHighlights} onChange={(footerHighlights) => onChange({ ...section, footerHighlights })} addLabel="Add highlight" />

      <div className="flex items-center justify-between pt-2">
        <Label>Plans</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              plans: [
                ...(section.plans || []),
                {
                  name: '',
                  price: '',
                  period: '',
                  badge: '',
                  accent: 'neutral',
                  features: [],
                  buttonLabel: '',
                  buttonHref: '#',
                },
              ],
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Add plan
        </Button>
      </div>

      <div className="space-y-3">
        {(section.plans || []).map((pl, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Plan {idx + 1}</div>
              <div className="flex items-center gap-2">
                <ReorderButtons
                  onUp={() => {
                    if (idx === 0) return
                    const next = [...section.plans]
                    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                    onChange({ ...section, plans: next })
                  }}
                  onDown={() => {
                    if (idx >= section.plans.length - 1) return
                    const next = [...section.plans]
                    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                    onChange({ ...section, plans: next })
                  }}
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => onChange({ ...section, plans: section.plans.filter((_, i) => i !== idx) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input placeholder="Name" value={pl.name} onChange={(e) => {
                const next = [...section.plans]; next[idx] = { ...pl, name: e.target.value }; onChange({ ...section, plans: next })
              }} />
              <Input placeholder="Price" value={pl.price} onChange={(e) => {
                const next = [...section.plans]; next[idx] = { ...pl, price: e.target.value }; onChange({ ...section, plans: next })
              }} />
              <Input placeholder="Period" value={pl.period} onChange={(e) => {
                const next = [...section.plans]; next[idx] = { ...pl, period: e.target.value }; onChange({ ...section, plans: next })
              }} />
              <Input placeholder="Badge (optional)" value={pl.badge || ''} onChange={(e) => {
                const next = [...section.plans]; next[idx] = { ...pl, badge: e.target.value }; onChange({ ...section, plans: next })
              }} />
              <ColorKeySelect value={pl.accent} onChange={(v) => {
                const next = [...section.plans]; next[idx] = { ...pl, accent: v }; onChange({ ...section, plans: next })
              }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input placeholder="Button label" value={pl.buttonLabel} onChange={(e) => {
                const next = [...section.plans]; next[idx] = { ...pl, buttonLabel: e.target.value }; onChange({ ...section, plans: next })
              }} />
              <Input placeholder="Button href" value={pl.buttonHref} onChange={(e) => {
                const next = [...section.plans]; next[idx] = { ...pl, buttonHref: e.target.value }; onChange({ ...section, plans: next })
              }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Payments Product ID (optional)"
                value={pl.productId ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim()
                  const next = [...section.plans]
                  next[idx] = { ...pl, productId: raw ? Number(raw) : undefined }
                  onChange({ ...section, plans: next })
                }}
              />
              <div className="text-xs text-gray-500 self-center">
                Set this to auto-open Stripe Checkout for this plan. You can find the Product ID in the Payments dashboard.
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select
                value={pl.productId ? String(pl.productId) : '__none__'}
                onValueChange={(v) => {
                  const next = [...section.plans]
                  next[idx] = { ...pl, productId: v === '__none__' ? undefined : Number(v) }
                  onChange({ ...section, plans: next })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No auto-checkout</SelectItem>
                  {(products || []).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} — ID {p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-500 self-center">
                Pick from your existing paid products. (IDs are also shown in Payments → Products & Subscriptions.)
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Features</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = [...section.plans]
                    const nextFeatures = [...(pl.features || []), { text: '', state: 'included' as const }]
                    next[idx] = { ...pl, features: nextFeatures }
                    onChange({ ...section, plans: next })
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add feature
                </Button>
              </div>
              {(pl.features || []).map((f, fIdx) => (
                <div key={fIdx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <div className="md:col-span-4">
                    <Input value={f.text} placeholder="Feature" onChange={(e) => {
                      const nextPlans = [...section.plans]
                      const nextFeatures = [...(pl.features || [])]
                      nextFeatures[fIdx] = { ...f, text: e.target.value }
                      nextPlans[idx] = { ...pl, features: nextFeatures }
                      onChange({ ...section, plans: nextPlans })
                    }} />
                  </div>
                  <div className="md:col-span-1">
                    <Select value={f.state} onValueChange={(v) => {
                      const nextPlans = [...section.plans]
                      const nextFeatures = [...(pl.features || [])]
                      nextFeatures[fIdx] = { ...f, state: v as any }
                      nextPlans[idx] = { ...pl, features: nextFeatures }
                      onChange({ ...section, plans: nextPlans })
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="included">Included</SelectItem>
                        <SelectItem value="excluded">Excluded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button type="button" variant="destructive" size="sm" onClick={() => {
                      const nextPlans = [...section.plans]
                      const nextFeatures = (pl.features || []).filter((_, i) => i !== fIdx)
                      nextPlans[idx] = { ...pl, features: nextFeatures }
                      onChange({ ...section, plans: nextPlans })
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}

export const TrustEditor = ({
  section,
  onChange,
}: {
  section: LandingTrustSection
  onChange: (s: LandingTrustSection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">Por Qué Confiar</h3>
    <div className="space-y-4">
      <Label>Title</Label>
      <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <StringListEditor label="Trust row" items={section.trustRow} onChange={(trustRow) => onChange({ ...section, trustRow })} addLabel="Add item" />

      <div className="flex items-center justify-between pt-2">
        <Label>Cards</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...section, cards: [...(section.cards || []), { title: '', body: '', iconKey: 'ShieldCheck' }] })}>
          <Plus className="h-4 w-4 mr-2" />
          Add card
        </Button>
      </div>
      <div className="space-y-3">
        {(section.cards || []).map((c, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Card {idx + 1}</div>
              <div className="flex items-center gap-2">
                <ReorderButtons
                  onUp={() => {
                    if (idx === 0) return
                    const next = [...section.cards]
                    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                    onChange({ ...section, cards: next })
                  }}
                  onDown={() => {
                    if (idx >= section.cards.length - 1) return
                    const next = [...section.cards]
                    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                    onChange({ ...section, cards: next })
                  }}
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => onChange({ ...section, cards: section.cards.filter((_, i) => i !== idx) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Input placeholder="Title" value={c.title} onChange={(e) => {
              const next = [...section.cards]; next[idx] = { ...c, title: e.target.value }; onChange({ ...section, cards: next })
            }} />
            <Textarea placeholder="Body" value={c.body} onChange={(e) => {
              const next = [...section.cards]; next[idx] = { ...c, body: e.target.value }; onChange({ ...section, cards: next })
            }} />
            <Input placeholder="Icon key" value={c.iconKey} onChange={(e) => {
              const next = [...section.cards]; next[idx] = { ...c, iconKey: e.target.value }; onChange({ ...section, cards: next })
            }} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const CommunityEditor = ({
  section,
  onChange,
}: {
  section: LandingCommunitySection
  onChange: (s: LandingCommunitySection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">Comunidad</h3>
    <div className="space-y-4">
      <Label>Anchor ID</Label>
      <Input value={section.id || ''} onChange={(e) => onChange({ ...section, id: e.target.value })} placeholder="comunidad" />
      <Label>Title</Label>
      <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <StringListEditor label="Bullets" items={section.bullets} onChange={(bullets) => onChange({ ...section, bullets })} addLabel="Add bullet" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input placeholder="Button label" value={section.buttonLabel} onChange={(e) => onChange({ ...section, buttonLabel: e.target.value })} />
        <Input placeholder="Button href" value={section.buttonHref} onChange={(e) => onChange({ ...section, buttonHref: e.target.value })} />
      </div>
      <Label>Mini testimonial</Label>
      <Textarea value={section.testimonial.quote} onChange={(e) => onChange({ ...section, testimonial: { ...section.testimonial, quote: e.target.value } })} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input placeholder="Name" value={section.testimonial.name} onChange={(e) => onChange({ ...section, testimonial: { ...section.testimonial, name: e.target.value } })} />
        <Input placeholder="Meta" value={section.testimonial.meta} onChange={(e) => onChange({ ...section, testimonial: { ...section.testimonial, meta: e.target.value } })} />
      </div>
    </div>
  </div>
)

export const FaqEditor = ({
  section,
  onChange,
}: {
  section: LandingFaqSection
  onChange: (s: LandingFaqSection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">FAQ</h3>
    <div className="space-y-4">
      <Label>Anchor ID</Label>
      <Input value={section.id || ''} onChange={(e) => onChange({ ...section, id: e.target.value })} placeholder="faq" />
      <Label>Title</Label>
      <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <div className="flex items-center justify-between">
        <Label>Items</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...section, items: [...(section.items || []), { q: '', a: '' }] })}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {(section.items || []).map((it, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Q{idx + 1}</div>
              <Button type="button" variant="destructive" size="sm" onClick={() => onChange({ ...section, items: section.items.filter((_, i) => i !== idx) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input placeholder="Question" value={it.q} onChange={(e) => {
              const next = [...section.items]; next[idx] = { ...it, q: e.target.value }; onChange({ ...section, items: next })
            }} />
            <Textarea placeholder="Answer" value={it.a} onChange={(e) => {
              const next = [...section.items]; next[idx] = { ...it, a: e.target.value }; onChange({ ...section, items: next })
            }} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const FinalCtaEditor = ({
  section,
  onChange,
}: {
  section: LandingFinalCtaSection
  onChange: (s: LandingFinalCtaSection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">CTA Final</h3>
    <div className="space-y-4">
      <ColoredTextSegmentsEditor label="Title segments" segments={section.title} onChange={(title) => onChange({ ...section, title })} />
      <Label>Subtitle</Label>
      <Textarea value={section.subtitle} onChange={(e) => onChange({ ...section, subtitle: e.target.value })} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Primary label</Label>
          <Input value={section.primaryCta.label} onChange={(e) => onChange({ ...section, primaryCta: { ...section.primaryCta, label: e.target.value } })} />
          <Label>Primary href</Label>
          <Input value={section.primaryCta.href} onChange={(e) => onChange({ ...section, primaryCta: { ...section.primaryCta, href: e.target.value } })} />
        </div>
        <div className="space-y-2">
          <Label>Secondary label</Label>
          <Input value={section.secondaryCta.label} onChange={(e) => onChange({ ...section, secondaryCta: { ...section.secondaryCta, label: e.target.value } })} />
          <Label>Secondary href</Label>
          <Input value={section.secondaryCta.href} onChange={(e) => onChange({ ...section, secondaryCta: { ...section.secondaryCta, href: e.target.value } })} />
        </div>
      </div>
    </div>
  </div>
)

export const FooterEditor = ({
  section,
  onChange,
}: {
  section: LandingFooterSection
  onChange: (s: LandingFooterSection) => void
}) => (
  <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
    <h3 className="font-semibold text-lg">Footer</h3>
    <div className="space-y-4">
      <Label>Copyright</Label>
      <Input value={section.copyright} onChange={(e) => onChange({ ...section, copyright: e.target.value })} />
      <div className="border-t pt-4 space-y-2">
        <div className="font-semibold">Newsletter</div>
        <Input placeholder="Title" value={section.newsletter.title} onChange={(e) => onChange({ ...section, newsletter: { ...section.newsletter, title: e.target.value } })} />
        <Input placeholder="Placeholder" value={section.newsletter.placeholder} onChange={(e) => onChange({ ...section, newsletter: { ...section.newsletter, placeholder: e.target.value } })} />
        <Input placeholder="Button label" value={section.newsletter.buttonLabel} onChange={(e) => onChange({ ...section, newsletter: { ...section.newsletter, buttonLabel: e.target.value } })} />
        <Input placeholder="Microcopy" value={section.newsletter.microcopy} onChange={(e) => onChange({ ...section, newsletter: { ...section.newsletter, microcopy: e.target.value } })} />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Label>Columns</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...section, columns: [...(section.columns || []), { title: '', links: [] }] })}>
          <Plus className="h-4 w-4 mr-2" />
          Add column
        </Button>
      </div>
      <div className="space-y-3">
        {(section.columns || []).map((col, cIdx) => (
          <div key={cIdx} className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Column {cIdx + 1}</div>
              <div className="flex items-center gap-2">
                <ReorderButtons
                  onUp={() => {
                    if (cIdx === 0) return
                    const next = [...section.columns]
                    ;[next[cIdx - 1], next[cIdx]] = [next[cIdx], next[cIdx - 1]]
                    onChange({ ...section, columns: next })
                  }}
                  onDown={() => {
                    if (cIdx >= section.columns.length - 1) return
                    const next = [...section.columns]
                    ;[next[cIdx + 1], next[cIdx]] = [next[cIdx], next[cIdx + 1]]
                    onChange({ ...section, columns: next })
                  }}
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => onChange({ ...section, columns: section.columns.filter((_, i) => i !== cIdx) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Input placeholder="Title" value={col.title} onChange={(e) => {
              const next = [...section.columns]; next[cIdx] = { ...col, title: e.target.value }; onChange({ ...section, columns: next })
            }} />

            <div className="flex items-center justify-between">
              <Label>Links</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const nextCols = [...section.columns]
                const nextLinks = [...(col.links || []), { label: '', href: '#' }]
                nextCols[cIdx] = { ...col, links: nextLinks }
                onChange({ ...section, columns: nextCols })
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add link
              </Button>
            </div>
            <div className="space-y-2">
              {(col.links || []).map((l, lIdx) => (
                <div key={lIdx} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                  <div className="md:col-span-3">
                    <Input placeholder="Label" value={l.label} onChange={(e) => {
                      const nextCols = [...section.columns]
                      const nextLinks = [...(col.links || [])]
                      nextLinks[lIdx] = { ...l, label: e.target.value }
                      nextCols[cIdx] = { ...col, links: nextLinks }
                      onChange({ ...section, columns: nextCols })
                    }} />
                  </div>
                  <div className="md:col-span-3">
                    <Input placeholder="Href" value={l.href} onChange={(e) => {
                      const nextCols = [...section.columns]
                      const nextLinks = [...(col.links || [])]
                      nextLinks[lIdx] = { ...l, href: e.target.value }
                      nextCols[cIdx] = { ...col, links: nextLinks }
                      onChange({ ...section, columns: nextCols })
                    }} />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <div className="flex items-center gap-2">
                      <ReorderButtons
                        onUp={() => {
                          if (lIdx === 0) return
                          const nextCols = [...section.columns]
                          const nextLinks = [...(col.links || [])]
                          ;[nextLinks[lIdx - 1], nextLinks[lIdx]] = [nextLinks[lIdx], nextLinks[lIdx - 1]]
                          nextCols[cIdx] = { ...col, links: nextLinks }
                          onChange({ ...section, columns: nextCols })
                        }}
                        onDown={() => {
                          if (lIdx >= (col.links || []).length - 1) return
                          const nextCols = [...section.columns]
                          const nextLinks = [...(col.links || [])]
                          ;[nextLinks[lIdx + 1], nextLinks[lIdx]] = [nextLinks[lIdx], nextLinks[lIdx + 1]]
                          nextCols[cIdx] = { ...col, links: nextLinks }
                          onChange({ ...section, columns: nextCols })
                        }}
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => {
                        const nextCols = [...section.columns]
                        const nextLinks = (col.links || []).filter((_, i) => i !== lIdx)
                        nextCols[cIdx] = { ...col, links: nextLinks }
                        onChange({ ...section, columns: nextCols })
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

