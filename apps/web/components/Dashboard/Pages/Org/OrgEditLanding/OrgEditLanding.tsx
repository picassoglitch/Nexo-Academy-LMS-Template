'use client'
import React from 'react'
import {
  LandingAboutSection,
  LandingCommunitySection,
  LandingFaqSection,
  LandingFinalCtaSection,
  LandingFooterSection,
  LandingHeroLeadMagnetSection,
  LandingHowItWorksSection,
  LandingObject,
  LandingPricingSection,
  LandingSchemaVersion,
  LandingSection,
  LandingTestimonialsGridSection,
  LandingTrustSection,
  LandingHeroSection,
  LandingTextAndImageSection,
  LandingLogos,
  LandingPeople,
  LandingBackground,
  LandingButton,
  LandingImage,
  LandingFeaturedCourses,
  LandingAccentColorKey,
  LandingNavbarConfig,
  LandingColoredTextSegment,
  LandingHowItWorksStep,
  LandingPricingPlan,
  LandingPricingFeature,
  LandingTrustCard,
  LandingFaqItem,
  LandingFooterColumn,
} from './landing_types'
import {
  Plus,
  Trash2,
  GripVertical,
  LayoutTemplate,
  ImageIcon,
  Users,
  Award,
  Edit,
  Link,
  Upload,
  Save,
  BookOpen,
  TextIcon,
  Sparkles,
  ShieldCheck,
  MessageSquareQuote,
  ListChecks,
  BadgeDollarSign,
  HelpCircle,
  Megaphone,
  PanelBottom,
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import { Label } from "@components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Button } from "@components/ui/button"
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { updateOrgLanding, uploadLandingContent } from '@services/organizations/orgs'
import { getOrgLandingMediaDirectory } from '@services/media/media'
import { getOrgCourses } from '@services/courses/courses'
import toast from 'react-hot-toast'
import useSWR from 'swr'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@components/ui/tabs"
import { useTranslation } from 'react-i18next'
import {
  AboutEditor,
  CommunityEditor,
  FaqEditor,
  FinalCtaEditor,
  FooterEditor,
  HeroLeadMagnetEditor,
  HowItWorksEditor,
  PricingEditor,
  TestimonialsGridEditor,
  TrustEditor,
} from './PremiumLandingEditors'

const tr = (t: any, key: string, fallback: string) => {
  const v = t(key)
  return v === key ? fallback : v
}

// This will be created inside the component to access translations
const getSectionTypes = (t: any) => ({
  hero: {
    icon: LayoutTemplate,
    label: tr(t, 'dashboard.organization.landing.section_types.hero.label', 'Hero (legacy)'),
    description: tr(t, 'dashboard.organization.landing.section_types.hero.description', 'Legacy hero section')
  },
  'text-and-image': {
    icon: ImageIcon,
    label: tr(t, 'dashboard.organization.landing.section_types.text_and_image.label', 'Text + Image (legacy)'),
    description: tr(t, 'dashboard.organization.landing.section_types.text_and_image.description', 'Legacy text section')
  },
  logos: {
    icon: Award,
    label: tr(t, 'dashboard.organization.landing.section_types.logos.label', 'Logos (legacy)'),
    description: tr(t, 'dashboard.organization.landing.section_types.logos.description', 'Legacy logos section')
  },
  people: {
    icon: Users,
    label: tr(t, 'dashboard.organization.landing.section_types.people.label', 'People (legacy)'),
    description: tr(t, 'dashboard.organization.landing.section_types.people.description', 'Legacy people section')
  },
  'featured-courses': {
    icon: BookOpen,
    label: tr(t, 'dashboard.organization.landing.section_types.featured_courses.label', 'Featured Courses (legacy)'),
    description: tr(t, 'dashboard.organization.landing.section_types.featured_courses.description', 'Legacy courses section')
  },

  // v2 Nexus premium landing sections
  heroLeadMagnet: {
    icon: Sparkles,
    label: 'Hero + Lead Magnet',
    description: 'Hero 2-column + lead magnet card'
  },
  about: {
    icon: ShieldCheck,
    label: 'Quiénes Somos',
    description: 'About section with bullets + video pill'
  },
  testimonialsGrid: {
    icon: MessageSquareQuote,
    label: 'Historias de Éxito',
    description: 'Testimonials 2x2 grid'
  },
  howItWorks: {
    icon: ListChecks,
    label: 'Cómo Funciona',
    description: '4-step process cards'
  },
  pricing: {
    icon: BadgeDollarSign,
    label: 'Pricing',
    description: '3-tier pricing with highlighted PRO'
  },
  trust: {
    icon: ShieldCheck,
    label: 'Por Qué Confiar',
    description: 'Trust grid + security row'
  },
  community: {
    icon: Users,
    label: 'Comunidad',
    description: 'Community CTA section'
  },
  faq: {
    icon: HelpCircle,
    label: 'FAQ',
    description: 'Accordion FAQ'
  },
  finalCta: {
    icon: Megaphone,
    label: 'CTA Final',
    description: 'Final call-to-action gradient'
  },
  footer: {
    icon: PanelBottom,
    label: 'Footer',
    description: 'Footer columns + newsletter'
  }
}) as const

const PREDEFINED_GRADIENTS = {
  'sunrise': {
    colors: ['#fef9f3', '#ffecd2'] as Array<string>,
    direction: '45deg'
  },
  'mint-breeze': {
    colors: ['#f0fff4', '#dcfce7'] as Array<string>,
    direction: '45deg'
  },
  'deep-ocean': {
    colors: ['#0f172a', '#1e3a8a'] as Array<string>,
    direction: '135deg'
  },
  'sunset-blaze': {
    colors: ['#7f1d1d', '#ea580c'] as Array<string>,
    direction: '45deg'
  },
  'midnight-purple': {
    colors: ['#581c87', '#7e22ce'] as Array<string>,
    direction: '90deg'
  },
  'forest-depths': {
    colors: ['#064e3b', '#059669'] as Array<string>,
    direction: '225deg'
  },
  'berry-fusion': {
    colors: ['#831843', '#be185d'] as Array<string>,
    direction: '135deg'
  },
  'cosmic-night': {
    colors: ['#1e1b4b', '#4338ca'] as Array<string>,
    direction: '45deg'
  },
  'autumn-fire': {
    colors: ['#7c2d12', '#c2410c'] as Array<string>,
    direction: '90deg'
  },
  'emerald-depths': {
    colors: ['#064e3b', '#10b981'] as Array<string>,
    direction: '135deg'
  },
  'royal-navy': {
    colors: ['#1e3a8a', '#3b82f6'] as Array<string>,
    direction: '225deg'
  },
  'volcanic': {
    colors: ['#991b1b', '#f97316'] as Array<string>,
    direction: '315deg'
  },
  'arctic-night': {
    colors: ['#0f172a', '#475569'] as Array<string>,
    direction: '90deg'
  },
  'grape-punch': {
    colors: ['#6b21a8', '#d946ef'] as Array<string>,
    direction: '135deg'
  },
  'marine-blue': {
    colors: ['#0c4a6e', '#0ea5e9'] as Array<string>,
    direction: '45deg'
  }
} as const

const GRADIENT_DIRECTIONS = {
  '45deg': '↗️ Top Right',
  '90deg': '⬆️ Top',
  '135deg': '↖️ Top Left',
  '180deg': '⬅️ Left',
  '225deg': '↙️ Bottom Left',
  '270deg': '⬇️ Bottom',
  '315deg': '↘️ Bottom Right',
  '0deg': '➡️ Right'
} as const

const OrgEditLanding = () => {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const SECTION_TYPES = getSectionTypes(t)
  
  const getSectionDisplayName = (section: LandingSection) => {
    return SECTION_TYPES[section.type as keyof typeof SECTION_TYPES].label
  }
  
  const [isLandingEnabled, setIsLandingEnabled] = React.useState(false)
  const [landingData, setLandingData] = React.useState<LandingObject>({
    schemaVersion: 2,
    sections: [],
    enabled: false,
    navbar: {
      brandTitle: 'NEXUS',
      brandSubtitle: 'INTELIGENCIA ARTIFICIAL',
      links: [
        { label: 'Inicio', href: '#inicio' },
        { label: 'Programas', href: '#programas' },
        { label: 'Cómo Funciona', href: '#como-funciona' },
        { label: 'Comunidad', href: '#comunidad' },
        { label: 'Quiénes Somos', href: '#quienes-somos' },
        { label: 'Precios', href: '#precios' },
        { label: 'FAQ', href: '#faq' },
      ],
      ctaLabel: 'Iniciar Sesión',
      ctaHref: '/login',
    },
  })
  const [selectedSection, setSelectedSection] = React.useState<number | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  // Safety: if sections change (delete/reorder) and the selected index becomes invalid,
  // avoid crashing the editor by clearing the selection.
  React.useEffect(() => {
    if (selectedSection === null) return
    if (!landingData.sections?.[selectedSection]) {
      setSelectedSection(null)
    }
  }, [selectedSection, landingData.sections])

  // Initialize landing data from org config
  React.useEffect(() => {
    if (org?.config?.config?.landing) {
      const landingConfig = org.config.config.landing
      const hasV2Section =
        Array.isArray(landingConfig.sections) &&
        landingConfig.sections.some((s: any) =>
          [
            'heroLeadMagnet',
            'about',
            'testimonialsGrid',
            'howItWorks',
            'pricing',
            'trust',
            'community',
            'faq',
            'finalCta',
            'footer',
          ].includes(s?.type)
        )
      setLandingData({
        sections: landingConfig.sections || [],
        enabled: landingConfig.enabled || false,
        schemaVersion: (landingConfig.schemaVersion as LandingSchemaVersion) || (hasV2Section ? 2 : 1),
        navbar: landingConfig.navbar || landingData.navbar,
      })
      setIsLandingEnabled(landingConfig.enabled || false)
    }
  }, [org])

  const addSection = (type: string) => {
    const newSection: LandingSection = createEmptySection(type)
    setLandingData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }))
  }

  const createEmptySection = (type: string): LandingSection => {
    switch (type) {
      // v2 premium landing defaults (safe placeholders)
      case 'heroLeadMagnet':
        return {
          type: 'heroLeadMagnet',
          id: 'inicio',
          headline: [
            { text: 'Aprende a usar IA para generar ', colorKey: 'neutral' },
            { text: 'ingresos reales', colorKey: 'blue' },
            { text: ', con guías probadas y una ', colorKey: 'neutral' },
            { text: 'comunidad que te respalda', colorKey: 'orange' },
          ],
          subtitle:
            'Educación práctica enfocada en ejecución. Únete a emprendedores que buscan aplicar IA de forma ética y medible.',
          // Tip: to send traffic to the qualification quiz, use a relative href like "./diagnostico"
          primaryCta: { label: 'Empieza a ganar dinero', href: '#precios' },
          secondaryCta: { label: 'Ver Cómo Funciona', href: '#como-funciona' },
          videoUrl: 'https://www.youtube.com/embed/ABC123',
          videoCard: {
            badgeText: 'Video de 3 minutos',
            title: '¿Listo para generar ingresos reales con IA?',
            subtitle:
              'Mira este video de 3 minutos y descubre cómo emprendedores como tú ya están facturando miles de pesos extra al mes.',
            ctaLabel: 'Empieza a ganar dinero ahora',
          },
          leadMagnet: {
            title: 'Guía Gratis de IA',
            subtitle: 'Recibe una guía práctica y editable para empezar hoy.',
            emailPlaceholder: 'Tu email',
            buttonLabel: 'Descargar Guía Gratis',
            microcopy: 'Sin spam. Puedes darte de baja en cualquier momento.',
            badgeText: '+2,500 descargas esta semana',
          },
        }
      case 'about':
        return {
          type: 'about',
          id: 'quienes-somos',
          title: 'Quiénes Somos',
          headline: 'Aprendizaje práctico con enfoque en ejecución',
          bullets: [
            'Contenido accionable y actualizado',
            'Comunidad para dudas y accountability',
            'Recursos y plantillas para implementar',
          ],
          videoLabel: 'Video: Conoce más sobre Nexo…',
          body: [
            'Construimos un espacio para aprender y aplicar IA con criterio, ética y foco en resultados medibles.',
            'Ajusta este texto desde el builder para reflejar tu historia real y tu propuesta de valor.',
          ],
        }
      case 'testimonialsGrid':
        return {
          type: 'testimonialsGrid',
          title: 'Historias de Éxito Reales',
          items: [
            {
              name: 'Ana P.',
              role: 'Emprendedora',
              location: 'MX',
              quote: 'El enfoque práctico me ayudó a pasar de ideas a ejecución.',
              metricLabel: 'Resultado',
              metricValue: 'Más claridad y constancia',
              colorKey: 'blue',
            },
            {
              name: 'Luis M.',
              role: 'Freelancer',
              location: 'CO',
              quote: 'Plantillas y comunidad = avance sostenido.',
              metricLabel: 'Resultado',
              metricValue: 'Procesos más eficientes',
              colorKey: 'orange',
            },
            {
              name: 'Carla R.',
              role: 'Marketer',
              location: 'ES',
              quote: 'Aprendí a probar, medir y mejorar.',
              metricLabel: 'Resultado',
              metricValue: 'Mejores experimentos',
              colorKey: 'green',
            },
            {
              name: 'Diego S.',
              role: 'Operador',
              location: 'AR',
              quote: 'Me dio un sistema, no solo teoría.',
              metricLabel: 'Resultado',
              metricValue: 'Sistema de ejecución',
              colorKey: 'purple',
            },
          ],
        }
      case 'howItWorks':
        return {
          type: 'howItWorks',
          id: 'como-funciona',
          title: 'Cómo Funciona',
          steps: [
            { title: 'Aprendes', body: 'Entiendes lo esencial con guías claras.', iconKey: 'BookOpen', colorKey: 'blue' },
            { title: 'Implementas', body: 'Aplicas con plantillas y ejemplos.', iconKey: 'Wrench', colorKey: 'orange' },
            { title: 'Ajustas', body: 'Mides, iteras y mejoras el sistema.', iconKey: 'LineChart', colorKey: 'green' },
            { title: 'Escalas', body: 'Estandarizas y creces con soporte.', iconKey: 'Rocket', colorKey: 'purple' },
          ],
        }
      case 'pricing':
        return {
          type: 'pricing',
          id: 'precios',
          title: 'Elige cómo quieres avanzar',
          subtitle: 'Selecciona el plan que mejor se adapte a tu etapa.',
          plans: [
            {
              name: 'Starter',
              price: '$299',
              period: 'USD',
              accent: 'neutral',
              badge: '',
              features: [
                { text: 'Acceso a guías base', state: 'included' },
                { text: 'Comunidad', state: 'included' },
                { text: 'Soporte prioritario', state: 'excluded' },
              ],
              buttonLabel: 'Empezar',
              buttonHref: '#',
            },
            {
              name: 'PRO',
              price: '$999',
              period: 'USD',
              accent: 'orange',
              badge: 'Más popular',
              features: [
                { text: 'Todo en Starter', state: 'included' },
                { text: 'Plantillas avanzadas', state: 'included' },
                { text: 'Sesiones en vivo', state: 'included' },
              ],
              buttonLabel: 'Elegir PRO',
              buttonHref: '#',
            },
            {
              name: 'Operator',
              price: '$3,999',
              period: 'USD',
              accent: 'neutral',
              badge: '',
              features: [
                { text: 'Acompañamiento', state: 'included' },
                { text: 'Revisión de implementación', state: 'included' },
                { text: 'SOPs y sistemas', state: 'included' },
              ],
              buttonLabel: 'Hablar con ventas',
              buttonHref: '#',
            },
          ],
          footerHighlights: ['Garantía 30 días', 'Acceso inmediato', 'Pago seguro'],
        }
      case 'trust':
        return {
          type: 'trust',
          title: 'Por Qué Confiar en Nosotros',
          cards: [
            { title: 'Metodología práctica', body: 'Enfoque en ejecución, no solo teoría.', iconKey: 'Check' },
            { title: 'Iteración', body: 'Mejoras con métricas y feedback.', iconKey: 'RefreshCcw' },
            { title: 'Comunidad', body: 'Acompañamiento y dudas resueltas.', iconKey: 'Users' },
            { title: 'Recursos', body: 'Plantillas y guías listas para usar.', iconKey: 'FileText' },
            { title: 'Actualizaciones', body: 'Contenido actualizado regularmente.', iconKey: 'Sparkles' },
            { title: 'Seguridad', body: 'Pagos seguros y protección.', iconKey: 'ShieldCheck' },
          ],
          trustRow: ['Pago seguro', 'Stripe', 'SSL Encriptado'],
        }
      case 'community':
        return {
          type: 'community',
          id: 'comunidad',
          title: 'Accede a Nuestra Comunidad Privada',
          bullets: ['Soporte entre miembros', 'Feedback y accountability', 'Recursos compartidos'],
          testimonial: {
            quote: 'Sentí progreso real al compartir avances y recibir feedback.',
            name: 'Miembro Nexo',
            meta: 'Testimonio editable',
          },
          buttonLabel: 'Únete a la comunidad',
          buttonHref: '#',
        }
      case 'faq':
        return {
          type: 'faq',
          id: 'faq',
          title: 'Preguntas Frecuentes',
          items: [
            { q: '¿Cuándo obtengo acceso?', a: 'Inmediatamente después del pago confirmado.' },
            { q: '¿Hay garantía?', a: 'Sí, revisa las condiciones del plan.' },
            { q: '¿Puedo cancelar?', a: 'Puedes cancelar tu suscripción cuando quieras.' },
            { q: '¿Necesito experiencia previa?', a: 'No, empezamos desde lo esencial.' },
            { q: '¿Cómo recibo soporte?', a: 'A través de la comunidad y recursos incluidos.' },
          ],
        }
      case 'finalCta':
        return {
          type: 'finalCta',
          title: [
            { text: '¿Listo para generar ingresos con IA ', colorKey: 'blue' },
            { text: 'de forma ética y práctica?', colorKey: 'orange' },
          ],
          subtitle: 'Únete hoy y empieza a ejecutar con guía y comunidad.',
          primaryCta: { label: 'Únete a Nexo hoy', href: '#precios' },
          secondaryCta: { label: 'Ver Cómo Funciona', href: '#como-funciona' },
        }
      case 'footer':
        return {
          type: 'footer',
          columns: [
            { title: 'Nexus', links: [{ label: 'Inicio', href: '#inicio' }, { label: 'Comunidad', href: '#comunidad' }] },
            { title: 'Programas', links: [{ label: 'Precios', href: '#precios' }, { label: 'Cómo Funciona', href: '#como-funciona' }] },
            { title: 'Información', links: [{ label: 'FAQ', href: '#faq' }, { label: 'Quiénes Somos', href: '#quienes-somos' }] },
          ],
          newsletter: {
            title: 'Newsletter',
            placeholder: 'Tu email',
            buttonLabel: 'Suscribirme',
            microcopy: 'Contenido práctico. Sin spam.',
          },
          copyright: '© Nexus. Todos los derechos reservados.',
        }
      case 'hero':
        return {
          type: 'hero',
          title: t('dashboard.organization.landing.hero_editor.section_title'),
          background: {
            type: 'solid',
            color: '#ffffff'
          },
          heading: {
            text: t('dashboard.organization.landing.hero_editor.heading_placeholder'),
            color: '#000000',
            size: 'large'
          },
          subheading: {
            text: t('dashboard.organization.landing.hero_editor.subheading_placeholder'),
            color: '#666666',
            size: 'medium'
          },
          buttons: [],
          illustration: undefined,
          contentAlign: 'center'
        }
      case 'text-and-image':
        return {
          type: 'text-and-image',
          title: t('dashboard.organization.landing.text_image_editor.title_placeholder'),
          text: t('dashboard.organization.landing.text_image_editor.content_placeholder'),
          flow: 'left',
          image: {
            url: '',
            alt: ''
          },
          buttons: []
        }
      case 'logos':
        return {
          type: 'logos',
          title: t('dashboard.organization.landing.logos_editor.title_placeholder'),
          logos: []
        }
      case 'people':
        return {
          type: 'people',
          title: t('dashboard.organization.landing.people_editor.title_placeholder'),
          people: []
        }
      case 'featured-courses':
        return {
          type: 'featured-courses',
          title: t('dashboard.organization.landing.courses_editor.title_placeholder'),
          courses: []
        }
      default:
        throw new Error('Invalid section type')
    }
  }

  const updateSection = (index: number, updatedSection: LandingSection) => {
    const newSections = [...landingData.sections]
    newSections[index] = updatedSection
    setLandingData(prev => ({
      ...prev,
      sections: newSections
    }))
  }

  const deleteSection = (index: number) => {
    setLandingData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }))
    setSelectedSection(null)
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(landingData.sections)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setLandingData(prev => ({
      ...prev,
      sections: items
    }))
    setSelectedSection(result.destination.index)
  }

  const handleSave = async () => {
    if (!org?.id) {
      toast.error('Organization ID not found')
      return
    }

    setIsSaving(true)
    try {
      const res = await updateOrgLanding(org.id, {
        sections: landingData.sections,
        enabled: isLandingEnabled,
        schemaVersion: landingData.schemaVersion || 1,
        navbar: landingData.navbar,
      }, access_token)

      if (res.status === 200) {
        toast.success(t('dashboard.organization.landing.saved_success'))
      } else {
        toast.error(t('dashboard.organization.landing.save_error'))
      }
    } catch (error) {
      toast.error(t('dashboard.organization.landing.save_error'))
      console.error('Error saving landing page:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="sm:mx-10 mx-0 bg-white rounded-xl nice-shadow">
      <div className="p-6 space-y-6">
        {/* Enable/Disable Landing Page */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center">{t('dashboard.organization.landing.title')} <div className="text-xs ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full"> {t('dashboard.organization.landing.beta')} </div></h2>
            <p className="text-gray-600">{t('dashboard.organization.landing.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isLandingEnabled}
                onChange={() => setIsLandingEnabled(!isLandingEnabled)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <Button 
              variant="default" 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-black hover:bg-black/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t('dashboard.organization.landing.saving') : t('dashboard.organization.landing.save_changes')}
            </Button>
          </div>
        </div>

        {isLandingEnabled && (
          <>
            {/* Premium landing navbar config (editable, no JSX hardcoding) */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 nice-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">Navbar</div>
                  <div className="text-sm text-gray-600">Edit brand + links + CTA for the landing navbar.</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand title</Label>
                  <Input
                    value={landingData.navbar?.brandTitle || ''}
                    onChange={(e) =>
                      setLandingData((prev) => ({
                        ...prev,
                        navbar: { ...(prev.navbar as any), brandTitle: e.target.value },
                      }))
                    }
                  />
                  <Label>Brand subtitle</Label>
                  <Input
                    value={landingData.navbar?.brandSubtitle || ''}
                    onChange={(e) =>
                      setLandingData((prev) => ({
                        ...prev,
                        navbar: { ...(prev.navbar as any), brandSubtitle: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA label</Label>
                  <Input
                    value={landingData.navbar?.ctaLabel || ''}
                    onChange={(e) =>
                      setLandingData((prev) => ({
                        ...prev,
                        navbar: { ...(prev.navbar as any), ctaLabel: e.target.value },
                      }))
                    }
                  />
                  <Label>CTA href</Label>
                  <Input
                    value={landingData.navbar?.ctaHref || ''}
                    onChange={(e) =>
                      setLandingData((prev) => ({
                        ...prev,
                        navbar: { ...(prev.navbar as any), ctaHref: e.target.value },
                      }))
                    }
                    placeholder="/login?orgslug=defaultorg"
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <Label>Links</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLandingData((prev) => ({
                        ...prev,
                        navbar: {
                          ...(prev.navbar as any),
                          links: [...((prev.navbar?.links || []) as any), { label: '', href: '#inicio' }],
                        },
                      }))
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add link
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {(landingData.navbar?.links || []).map((l: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                      <div className="md:col-span-3">
                        <Input
                          placeholder="Label"
                          value={l.label}
                          onChange={(e) => {
                            const next = [...(landingData.navbar?.links || [])]
                            next[idx] = { ...l, label: e.target.value }
                            setLandingData((prev) => ({ ...prev, navbar: { ...(prev.navbar as any), links: next } }))
                          }}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          placeholder="#anchor"
                          value={l.href}
                          onChange={(e) => {
                            const next = [...(landingData.navbar?.links || [])]
                            next[idx] = { ...l, href: e.target.value }
                            setLandingData((prev) => ({ ...prev, navbar: { ...(prev.navbar as any), links: next } }))
                          }}
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (idx === 0) return
                              const next = [...(landingData.navbar?.links || [])]
                              ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                              setLandingData((prev) => ({ ...prev, navbar: { ...(prev.navbar as any), links: next } }))
                            }}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const links = landingData.navbar?.links || []
                              if (idx >= links.length - 1) return
                              const next = [...links]
                              ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
                              setLandingData((prev) => ({ ...prev, navbar: { ...(prev.navbar as any), links: next } }))
                            }}
                          >
                            ↓
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const next = (landingData.navbar?.links || []).filter((_: any, i: number) => i !== idx)
                              setLandingData((prev) => ({ ...prev, navbar: { ...(prev.navbar as any), links: next } }))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section List */}
            <div className="grid grid-cols-4 gap-6">
              {/* Sections Panel */}
              <div className="col-span-1 border-r pr-4">
                <h3 className="font-medium mb-4">{t('dashboard.organization.landing.sections')}</h3>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="sections">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {landingData.sections.map((section, index) => (
                          <Draggable
                            key={`section-${index}`}
                            draggableId={`section-${index}`}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                onClick={() => setSelectedSection(index)}
                                className={`p-4 bg-white/80 backdrop-blur-xs rounded-lg cursor-pointer border  ${
                                  selectedSection === index 
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs' 
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-xs'
                                } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500/20 rotate-2' : ''}`}
                              >
                                <div className="flex items-center justify-between group">
                                  <div className="flex items-center space-x-3">
                                    <div {...provided.dragHandleProps} 
                                      className={`p-1.5 rounded-md transition-colors duration-200 ${
                                        selectedSection === index 
                                          ? 'text-blue-500 bg-blue-100/50' 
                                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                      }`}>
                                      <GripVertical size={16} />
                                    </div>
                                    <div className={`p-1.5 rounded-md ${
                                      selectedSection === index 
                                        ? 'text-blue-600 bg-blue-100/50' 
                                        : 'text-gray-600 bg-gray-100/50'
                                    }`}>
                                      {React.createElement(SECTION_TYPES[section.type as keyof typeof SECTION_TYPES].icon, {
                                        size: 16
                                      })}
                                    </div>
                                    <span className={`text-sm font-medium truncate capitalize ${
                                      selectedSection === index 
                                        ? 'text-blue-700' 
                                        : 'text-gray-700'
                                    }`}>
                                      {getSectionDisplayName(section)}
                                    </span>
                                  </div>
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedSection(index)
                                      }}
                                      className={`p-1.5 rounded-md transition-colors duration-200 ${
                                        selectedSection === index
                                          ? 'text-blue-500 hover:bg-blue-100'
                                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                      }`}
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteSection(index)
                                      }}
                                      className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-200"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                <div className="pt-4">
                  <Select
                    onValueChange={(value) => {
                      if (value) {
                        addSection(value)
                      }
                    }}
                  >
                    {/* Keep SelectTrigger as the single button; render the inner Button as a non-button to avoid nesting */}
                    <SelectTrigger className="w-full p-0 border-0 bg-transparent">
                      <Button asChild variant="default" className="w-full bg-black hover:bg-black/90 text-white">
                        <div className="w-full flex items-center justify-center">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('dashboard.organization.landing.add_section')}
                        </div>
                      </Button>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SECTION_TYPES).map(([type, { icon: Icon, label, description }]) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center space-x-3 py-1">
                            <div className="p-1.5 bg-gray-50 rounded-md">
                              <Icon size={16} className="text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-700">{label}</div>
                              <div className="text-xs text-gray-500">{description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Editor Panel */}
              <div className="col-span-3">
                {selectedSection !== null && landingData.sections?.[selectedSection] ? (
                  <SectionEditor
                    section={landingData.sections[selectedSection]}
                    onChange={(updatedSection) => updateSection(selectedSection, updatedSection)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    {t('dashboard.organization.landing.select_section')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface SectionEditorProps {
  section: LandingSection
  onChange: (section: LandingSection) => void
}

const SectionEditor: React.FC<SectionEditorProps> = ({ section, onChange }) => {
  switch (section.type) {
    case 'heroLeadMagnet':
      return <HeroLeadMagnetEditor section={section} onChange={onChange as any} />
    case 'about':
      return <AboutEditor section={section} onChange={onChange as any} />
    case 'testimonialsGrid':
      return <TestimonialsGridEditor section={section} onChange={onChange as any} />
    case 'howItWorks':
      return <HowItWorksEditor section={section} onChange={onChange as any} />
    case 'pricing':
      return <PricingEditor section={section} onChange={onChange as any} />
    case 'trust':
      return <TrustEditor section={section} onChange={onChange as any} />
    case 'community':
      return <CommunityEditor section={section} onChange={onChange as any} />
    case 'faq':
      return <FaqEditor section={section} onChange={onChange as any} />
    case 'finalCta':
      return <FinalCtaEditor section={section} onChange={onChange as any} />
    case 'footer':
      return <FooterEditor section={section} onChange={onChange as any} />
    case 'hero':
      return <HeroSectionEditor section={section} onChange={onChange} />
    case 'text-and-image':
      return <TextAndImageSectionEditor section={section} onChange={onChange} />
    case 'logos':
      return <LogosSectionEditor section={section} onChange={onChange} />
    case 'people':
      return <PeopleSectionEditor section={section} onChange={onChange} />
    case 'featured-courses':
      return <FeaturedCoursesEditor section={section} onChange={onChange} />
    default:
      return <div>Unknown section type</div>
  }
}

const HeroSectionEditor: React.FC<{
  section: LandingHeroSection
  onChange: (section: LandingHeroSection) => void
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onChange({
          ...section,
          background: {
            type: 'image',
            image: reader.result as string
          }
        })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <LayoutTemplate className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('dashboard.organization.landing.hero_editor.title')}</h3>
      </div>
      
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="title">{t('dashboard.organization.landing.hero_editor.section_title')}</Label>
          <Input
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('dashboard.organization.landing.hero_editor.section_title_placeholder')}
          />
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-lg">
            <TabsTrigger value="content" className="flex items-center space-x-2">
              <TextIcon className="h-4 w-4" />
              <span>{t('dashboard.organization.landing.hero_editor.tabs.content')}</span>
            </TabsTrigger>
            <TabsTrigger value="background" className="flex items-center space-x-2">
              <LayoutTemplate className="h-4 w-4" />
              <span>{t('dashboard.organization.landing.hero_editor.tabs.background')}</span>
            </TabsTrigger>
            <TabsTrigger value="buttons" className="flex items-center space-x-2">
              {/* Use an icon here (not the UI Button component) to avoid nested <button> in TabsTrigger */}
              <Link className="h-4 w-4" />
              <span>{t('dashboard.organization.landing.hero_editor.tabs.buttons')}</span>
            </TabsTrigger>
            <TabsTrigger value="illustration" className="flex items-center space-x-2">
              <ImageIcon className="h-4 w-4" />
              <span>{t('dashboard.organization.landing.hero_editor.tabs.illustration')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            {/* Heading */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="heading">{t('dashboard.organization.landing.hero_editor.heading')}</Label>
                <Input
                  id="heading"
                  value={section.heading.text}
                  onChange={(e) => onChange({
                    ...section,
                    heading: { ...section.heading, text: e.target.value }
                  })}
                  placeholder={t('dashboard.organization.landing.hero_editor.heading_placeholder')}
                />
              </div>
              <div>
                <Label htmlFor="headingColor">{t('dashboard.organization.landing.hero_editor.heading_color')}</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="headingColor"
                    type="color"
                    value={section.heading.color}
                    onChange={(e) => onChange({
                      ...section,
                      heading: { ...section.heading, color: e.target.value }
                    })}
                    className="w-20 h-10 p-1"
                  />
                  <Input
                    value={section.heading.color}
                    onChange={(e) => onChange({
                      ...section,
                      heading: { ...section.heading, color: e.target.value }
                    })}
                    placeholder="#000000"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Subheading */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="subheading">{t('dashboard.organization.landing.hero_editor.subheading')}</Label>
                <Input
                  id="subheading"
                  value={section.subheading.text}
                  onChange={(e) => onChange({
                    ...section,
                    subheading: { ...section.subheading, text: e.target.value }
                  })}
                  placeholder={t('dashboard.organization.landing.hero_editor.subheading_placeholder')}
                />
              </div>
              <div>
                <Label htmlFor="subheadingColor">{t('dashboard.organization.landing.hero_editor.subheading_color')}</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="subheadingColor"
                    type="color"
                    value={section.subheading.color}
                    onChange={(e) => onChange({
                      ...section,
                      subheading: { ...section.subheading, color: e.target.value }
                    })}
                    className="w-20 h-10 p-1"
                  />
                  <Input
                    value={section.subheading.color}
                    onChange={(e) => onChange({
                      ...section,
                      subheading: { ...section.subheading, color: e.target.value }
                    })}
                    placeholder="#666666"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="background" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="background">{t('dashboard.organization.landing.hero_editor.background_type')}</Label>
              <Select
                value={section.background.type}
                onValueChange={(value) => {
                  onChange({
                    ...section,
                    background: { 
                      type: value as LandingBackground['type'],
                      color: value === 'solid' ? '#ffffff' : undefined,
                      colors: value === 'gradient' ? PREDEFINED_GRADIENTS['sunrise'].colors : undefined,
                      image: value === 'image' ? '' : undefined
                    }
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.organization.landing.hero_editor.background_type_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">{t('dashboard.organization.landing.hero_editor.background_types.solid')}</SelectItem>
                  <SelectItem value="gradient">{t('dashboard.organization.landing.hero_editor.background_types.gradient')}</SelectItem>
                  <SelectItem value="image">{t('dashboard.organization.landing.hero_editor.background_types.image')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {section.background.type === 'solid' && (
              <div>
                <Label htmlFor="backgroundColor">{t('dashboard.organization.landing.hero_editor.background_color')}</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={section.background.color || '#ffffff'}
                    onChange={(e) => onChange({
                      ...section,
                      background: { ...section.background, color: e.target.value }
                    })}
                    className="w-20 h-10 p-1"
                  />
                  <Input
                    value={section.background.color || '#ffffff'}
                    onChange={(e) => onChange({
                      ...section,
                      background: { ...section.background, color: e.target.value }
                    })}
                    placeholder="#ffffff"
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {section.background.type === 'gradient' && (
              <div className="space-y-4">
                <div>
                  <Label>{t('dashboard.organization.landing.hero_editor.gradient_type')}</Label>
                  <Select
                    value={Object.values(PREDEFINED_GRADIENTS).some(
                      preset => preset.colors[0] === section.background.colors?.[0] && 
                                preset.colors[1] === section.background.colors?.[1]
                    ) ? 'preset' : 'custom'}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        onChange({
                          ...section,
                          background: {
                            type: 'gradient',
                            colors: ['#ffffff', '#f0f0f0'],
                            direction: section.background.direction || '45deg'
                          }
                        })
                      } else {
                        onChange({
                          ...section,
                          background: {
                            type: 'gradient',
                            colors: PREDEFINED_GRADIENTS['sunrise'].colors,
                            direction: PREDEFINED_GRADIENTS['sunrise'].direction
                          }
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.organization.landing.hero_editor.gradient_type_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preset">{t('dashboard.organization.landing.hero_editor.gradient_types.preset')}</SelectItem>
                      <SelectItem value="custom">{t('dashboard.organization.landing.hero_editor.gradient_types.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!Object.values(PREDEFINED_GRADIENTS).some(
                  preset => preset.colors[0] === section.background.colors?.[0] && 
                            preset.colors[1] === section.background.colors?.[1]
                ) ? (
                  <div className="space-y-4">
                    <div>
                      <Label>{t('dashboard.organization.landing.hero_editor.start_color')}</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          value={section.background.colors?.[0] || '#ffffff'}
                          onChange={(e) => onChange({
                            ...section,
                            background: {
                              ...section.background,
                              colors: [e.target.value, section.background.colors?.[1] || '#f0f0f0']
                            }
                          })}
                          className="w-20 h-10 p-1"
                        />
                        <Input
                          value={section.background.colors?.[0] || '#ffffff'}
                          onChange={(e) => onChange({
                            ...section,
                            background: {
                              ...section.background,
                              colors: [e.target.value, section.background.colors?.[1] || '#f0f0f0']
                            }
                          })}
                          placeholder="#ffffff"
                          className="font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>{t('dashboard.organization.landing.hero_editor.end_color')}</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          value={section.background.colors?.[1] || '#f0f0f0'}
                          onChange={(e) => onChange({
                            ...section,
                            background: {
                              ...section.background,
                              colors: [section.background.colors?.[0] || '#ffffff', e.target.value]
                            }
                          })}
                          className="w-20 h-10 p-1"
                        />
                        <Input
                          value={section.background.colors?.[1] || '#f0f0f0'}
                          onChange={(e) => onChange({
                            ...section,
                            background: {
                              ...section.background,
                              colors: [section.background.colors?.[0] || '#ffffff', e.target.value]
                            }
                          })}
                          placeholder="#f0f0f0"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>{t('dashboard.organization.landing.hero_editor.gradient_preset')}</Label>
                    <Select
                      value={Object.entries(PREDEFINED_GRADIENTS).find(
                        ([_, gradient]) => 
                          gradient.colors[0] === section.background.colors?.[0] &&
                          gradient.colors[1] === section.background.colors?.[1]
                      )?.[0] || 'sunrise'}
                      onValueChange={(value) => onChange({
                        ...section,
                        background: {
                          ...section.background,
                          colors: PREDEFINED_GRADIENTS[value as keyof typeof PREDEFINED_GRADIENTS].colors,
                          direction: PREDEFINED_GRADIENTS[value as keyof typeof PREDEFINED_GRADIENTS].direction
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.organization.landing.hero_editor.gradient_preset_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PREDEFINED_GRADIENTS).map(([name]) => (
                          <SelectItem key={name} value={name}>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-8 h-8 rounded-md"
                                style={{
                                  background: `linear-gradient(${PREDEFINED_GRADIENTS[name as keyof typeof PREDEFINED_GRADIENTS].direction}, ${PREDEFINED_GRADIENTS[name as keyof typeof PREDEFINED_GRADIENTS].colors.join(', ')})`
                                }}
                              />
                              <span className="capitalize">{name.replace('-', ' ')}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>{t('dashboard.organization.landing.hero_editor.gradient_direction')}</Label>
                  <Select
                    value={section.background.direction || '45deg'}
                    onValueChange={(value) => onChange({
                      ...section,
                      background: { ...section.background, direction: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.organization.landing.hero_editor.gradient_direction_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GRADIENT_DIRECTIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-2">
                  <div 
                    className="w-full h-20 rounded-lg"
                    style={{
                      background: `linear-gradient(${section.background.direction}, ${section.background.colors?.join(', ')})`
                    }}
                  />
                </div>
              </div>
            )}

            {section.background.type === 'image' && (
              <div className="space-y-4">
                <div>
                  <Label>{t('dashboard.organization.landing.hero_editor.background_image')}</Label>
                  <div className="mt-2 flex items-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('imageUpload')?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('dashboard.organization.landing.hero_editor.upload_image')}
                    </Button>
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  {section.background.image && (
                    <div className="mt-4">
                      <img
                        src={section.background.image}
                        alt="Background preview"
                        className="max-h-40 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="buttons" className="space-y-4 mt-4">
            <div className="space-y-3">
              {section.buttons.map((button, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>{t('dashboard.organization.landing.hero_editor.button_text_colors')}</Label>
                    <Input
                      value={button.text}
                      onChange={(e) => {
                        const newButtons = [...section.buttons]
                        newButtons[index] = { ...button, text: e.target.value }
                        onChange({ ...section, buttons: newButtons })
                      }}
                      placeholder={t('dashboard.organization.landing.hero_editor.button_text')}
                    />
                    <div className="flex items-center space-x-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('dashboard.organization.landing.hero_editor.text_color')}</Label>
                        <Input
                          type="color"
                          value={button.color}
                          onChange={(e) => {
                            const newButtons = [...section.buttons]
                            newButtons[index] = { ...button, color: e.target.value }
                            onChange({ ...section, buttons: newButtons })
                          }}
                          className="w-full h-8 p-1"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('dashboard.organization.landing.hero_editor.background_color_label')}</Label>
                        <Input
                          type="color"
                          value={button.background}
                          onChange={(e) => {
                            const newButtons = [...section.buttons]
                            newButtons[index] = { ...button, background: e.target.value }
                            onChange({ ...section, buttons: newButtons })
                          }}
                          className="w-full h-8 p-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('dashboard.organization.landing.hero_editor.button_link')}</Label>
                    <div className="flex items-center space-x-2">
                      <Link className="h-4 w-4 text-gray-500" />
                      <Input
                        value={button.link}
                        onChange={(e) => {
                          const newButtons = [...section.buttons]
                          newButtons[index] = { ...button, link: e.target.value }
                          onChange({ ...section, buttons: newButtons })
                        }}
                        placeholder={t('dashboard.organization.landing.hero_editor.button_link_placeholder')}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newButtons = section.buttons.filter((_, i) => i !== index)
                      onChange({ ...section, buttons: newButtons })
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 self-start mt-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {section.buttons.length < 2 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const newButton: LandingButton = {
                      text: t('dashboard.organization.landing.hero_editor.button_text'),
                      link: '#',
                      color: '#ffffff',
                      background: '#000000'
                    }
                    onChange({
                      ...section,
                      buttons: [...section.buttons, newButton]
                    })
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.organization.landing.hero_editor.add_button')}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="illustration" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('dashboard.organization.landing.hero_editor.illustration_image')}</Label>
                <Input
                  value={section.illustration?.image.url || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      onChange({
                        ...section,
                        illustration: {
                          image: { url: e.target.value, alt: section.illustration?.image.alt || '' },
                          position: 'left',
                          verticalAlign: 'center',
                          size: 'medium'
                        }
                      })
                    }
                  }}
                  placeholder={t('dashboard.organization.landing.hero_editor.illustration_url')}
                />
                <Input
                  value={section.illustration?.image.alt || ''}
                  onChange={(e) => {
                    if (section.illustration?.image.url) {
                      onChange({
                        ...section,
                        illustration: {
                          ...section.illustration,
                          image: { ...section.illustration.image, alt: e.target.value }
                        }
                      })
                    }
                  }}
                  placeholder={t('dashboard.organization.landing.hero_editor.alt_text')}
                />
                <ImageUploader
                  id="hero-illustration"
                  onImageUploaded={(url) => onChange({
                    ...section,
                    illustration: {
                      image: { url, alt: section.illustration?.image.alt || '' },
                      position: 'left',
                      verticalAlign: 'center',
                      size: 'medium'
                    }
                  })}
                  buttonText={t('dashboard.organization.landing.hero_editor.upload_illustration')}
                />
                {section.illustration?.image.url && (
                  <img
                    src={section.illustration?.image.url}
                    alt={section.illustration?.image.alt}
                    className="h-12 object-contain"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('dashboard.organization.landing.hero_editor.position')}</Label>
                  <Select
                    value={section.illustration?.position || 'left'}
                    onValueChange={(value: 'left' | 'right') => onChange({
                      ...section,
                      illustration: {
                        ...section.illustration,
                        position: value,
                        image: section.illustration?.image || { url: '', alt: '' },
                        size: section.illustration?.size || 'medium',
                        verticalAlign: section.illustration?.verticalAlign || 'center'
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.organization.landing.hero_editor.position_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">{t('dashboard.organization.landing.hero_editor.positions.left')}</SelectItem>
                      <SelectItem value="right">{t('dashboard.organization.landing.hero_editor.positions.right')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('dashboard.organization.landing.hero_editor.size')}</Label>
                  <Select
                    value={section.illustration?.size || 'medium'}
                    onValueChange={(value: 'small' | 'medium' | 'large') => onChange({
                      ...section,
                      illustration: {
                        ...section.illustration,
                        size: value,
                        image: section.illustration?.image || { url: '', alt: '' },
                        position: (section.illustration?.position || 'left') as 'left' | 'right',
                        verticalAlign: section.illustration?.verticalAlign || 'center'
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.organization.landing.hero_editor.size_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">{t('dashboard.organization.landing.hero_editor.sizes.small')}</SelectItem>
                      <SelectItem value="medium">{t('dashboard.organization.landing.hero_editor.sizes.medium')}</SelectItem>
                      <SelectItem value="large">{t('dashboard.organization.landing.hero_editor.sizes.large')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {section.illustration?.image.url && (
                <Button
                  variant="ghost"
                  onClick={() => onChange({
                    ...section,
                    illustration: undefined
                  })}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('dashboard.organization.landing.hero_editor.remove_illustration')}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void
  className?: string
  buttonText?: string
  id: string
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUploaded, className, buttonText = "Upload Image", id }) => {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [isUploading, setIsUploading] = React.useState(false)
  const inputId = `imageUpload-${id}`

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file using reusable utility
    const { validateFile } = await import('@/lib/file-validation')
    const validation = validateFile(file, ['image'])
    
    if (!validation.valid) {
      toast.error(validation.error!)
      e.target.value = '' // Clear the input
      return
    }

    setIsUploading(true)
    try {
      const response = await uploadLandingContent(org.id, file, access_token)
      if (response.status === 200) {
        const imageUrl = getOrgLandingMediaDirectory(org.org_uuid, response.data.filename)
        onImageUploaded(imageUrl)
        toast.success(t('dashboard.organization.images.toasts.logo_success'))
      } else {
        toast.error(t('dashboard.organization.images.toasts.logo_error'))
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error(t('dashboard.organization.images.toasts.logo_error'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={className}>
      <Button
        variant="outline"
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={isUploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? t('dashboard.organization.images.uploading') : buttonText}
      </Button>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

const TextAndImageSectionEditor: React.FC<{
  section: LandingTextAndImageSection
  onChange: (section: LandingTextAndImageSection) => void
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <ImageIcon className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('dashboard.organization.landing.text_image_editor.title')}</h3>
      </div>
      
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="title">{t('dashboard.organization.landing.text_image_editor.title_label')}</Label>
          <Input
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('dashboard.organization.landing.text_image_editor.title_placeholder')}
          />
        </div>

        {/* Text */}
        <div>
          <Label htmlFor="content">{t('dashboard.organization.landing.text_image_editor.content')}</Label>
          <Textarea
            id="content"
            value={section.text}
            onChange={(e) => onChange({ ...section, text: e.target.value })}
            placeholder={t('dashboard.organization.landing.text_image_editor.content_placeholder')}
            className="min-h-[100px]"
          />
        </div>

        {/* Flow */}
        <div>
          <Label htmlFor="flow">{t('dashboard.organization.landing.text_image_editor.image_position')}</Label>
          <Select
            value={section.flow}
            onValueChange={(value) => onChange({ ...section, flow: value as 'left' | 'right' })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('dashboard.organization.landing.text_image_editor.image_position_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t('dashboard.organization.landing.text_image_editor.positions.left')}</SelectItem>
              <SelectItem value="right">{t('dashboard.organization.landing.text_image_editor.positions.right')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Image */}
        <div>
          <Label>{t('dashboard.organization.landing.text_image_editor.image')}</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Input
                value={section.image.url}
                onChange={(e) => onChange({
                  ...section,
                  image: { ...section.image, url: e.target.value }
                })}
                placeholder={t('dashboard.organization.landing.text_image_editor.image_url')}
              />
              <ImageUploader
                id="text-image-section"
                onImageUploaded={(url) => onChange({
                  ...section,
                  image: { ...section.image, url }
                })}
                buttonText={t('dashboard.organization.landing.text_image_editor.upload_new_image')}
              />
            </div>
            <div>
              <Input
                value={section.image.alt}
                onChange={(e) => onChange({
                  ...section,
                  image: { ...section.image, alt: e.target.value }
                })}
                placeholder={t('dashboard.organization.landing.text_image_editor.alt_text')}
              />
            </div>
          </div>
          {section.image.url && (
            <div className="mt-4">
              <img
                src={section.image.url}
                alt={section.image.alt}
                className="max-h-40 rounded-lg object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const LogosSectionEditor: React.FC<{
  section: LandingLogos
  onChange: (section: LandingLogos) => void
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <Award className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('dashboard.organization.landing.logos_editor.title')}</h3>
      </div>
      
      <div>
        <Label>{t('dashboard.organization.landing.logos_editor.logos')}</Label>
        <div className="space-y-3 mt-2">
          {/* Title */}
          <div>
            <Label htmlFor="title">{t('dashboard.organization.landing.logos_editor.title_label')}</Label>
            <Input
              id="title"
              value={section.title}
              onChange={(e) => onChange({ ...section, title: e.target.value })}
              placeholder={t('dashboard.organization.landing.logos_editor.title_placeholder')}
            />
          </div>

          {section.logos.map((logo, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <div className="space-y-2">
                <Input
                  value={logo.url}
                  onChange={(e) => {
                    const newLogos = [...section.logos]
                    newLogos[index] = { ...logo, url: e.target.value }
                    onChange({ ...section, logos: newLogos })
                  }}
                  placeholder={t('dashboard.organization.landing.logos_editor.logo_url')}
                />
                <ImageUploader
                  id={`logo-${index}`}
                  onImageUploaded={(url) => {
                    const newLogos = [...section.logos]
                    newLogos[index] = { ...section.logos[index], url }
                    onChange({ ...section, logos: newLogos })
                  }}
                  buttonText={t('dashboard.organization.landing.logos_editor.upload_logo')}
                />
              </div>
              <div className="space-y-2">
                <Input
                  value={logo.alt}
                  onChange={(e) => {
                    const newLogos = [...section.logos]
                    newLogos[index] = { ...logo, alt: e.target.value }
                    onChange({ ...section, logos: newLogos })
                  }}
                  placeholder={t('dashboard.organization.landing.logos_editor.alt_text')}
                />
                {logo.url && (
                  <img
                    src={logo.url}
                    alt={logo.alt}
                    className="h-10 object-contain"
                  />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newLogos = section.logos.filter((_, i) => i !== index)
                  onChange({ ...section, logos: newLogos })
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              const newLogo: LandingImage = {
                url: '',
                alt: ''
              }
              onChange({
                ...section,
                logos: [...section.logos, newLogo]
              })
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('dashboard.organization.landing.logos_editor.add_logo')}
          </Button>
        </div>
      </div>
    </div>
  )
}

const PeopleSectionEditor: React.FC<{
  section: LandingPeople
  onChange: (section: LandingPeople) => void
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <Users className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('dashboard.organization.landing.people_editor.title')}</h3>
      </div>
      
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="title">{t('dashboard.organization.landing.people_editor.title_label')}</Label>
          <Input
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('dashboard.organization.landing.people_editor.title_placeholder')}
          />
        </div>

        {/* People List */}
        <div>
          <Label>{t('dashboard.organization.landing.people_editor.people')}</Label>
          <div className="space-y-4 mt-2">
            {section.people.map((person, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>{t('dashboard.organization.landing.people_editor.name')}</Label>
                  <Input
                    value={person.name}
                    onChange={(e) => {
                      const newPeople = [...section.people]
                      newPeople[index] = { ...person, name: e.target.value }
                      onChange({ ...section, people: newPeople })
                    }}
                    placeholder={t('dashboard.organization.landing.people_editor.name_placeholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('dashboard.organization.landing.people_editor.username')}</Label>
                  <Input
                    value={person.username || ''}
                    onChange={(e) => {
                      const newPeople = [...section.people]
                      newPeople[index] = { ...person, username: e.target.value }
                      onChange({ ...section, people: newPeople })
                    }}
                    placeholder={t('dashboard.organization.landing.people_editor.username_placeholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('dashboard.organization.landing.people_editor.image')}</Label>
                  <div className="space-y-2">
                    <Input
                      value={person.image_url}
                      onChange={(e) => {
                        const newPeople = [...section.people]
                        newPeople[index] = { ...person, image_url: e.target.value }
                        onChange({ ...section, people: newPeople })
                      }}
                      placeholder={t('dashboard.organization.landing.people_editor.image_url')}
                    />
                    <ImageUploader
                      id={`person-${index}`}
                      onImageUploaded={(url) => {
                        const newPeople = [...section.people]
                        newPeople[index] = { ...section.people[index], image_url: url }
                        onChange({ ...section, people: newPeople })
                      }}
                      buttonText={t('dashboard.organization.landing.people_editor.upload_avatar')}
                    />
                    {person.image_url && (
                      <img
                        src={person.image_url}
                        alt={person.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('dashboard.organization.landing.people_editor.description')}</Label>
                  <Input
                    value={person.description}
                    onChange={(e) => {
                      const newPeople = [...section.people]
                      newPeople[index] = { ...person, description: e.target.value }
                      onChange({ ...section, people: newPeople })
                    }}
                    placeholder={t('dashboard.organization.landing.people_editor.description_placeholder')}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newPeople = section.people.filter((_, i) => i !== index)
                      onChange({ ...section, people: newPeople })
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newPerson = {
                  user_uuid: '',
                  name: '',
                  description: '',
                  image_url: '',
                  username: ''
                }
                onChange({
                  ...section,
                  people: [...section.people, newPerson]
                })
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.organization.landing.people_editor.add_person')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const FeaturedCoursesEditor: React.FC<{
  section: LandingFeaturedCourses
  onChange: (section: LandingFeaturedCourses) => void
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const { data: courses } = useSWR(
    org?.slug ? [org.slug, access_token] : null,
    ([orgSlug, token]) => getOrgCourses(orgSlug, null, token)
  )

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <BookOpen className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('dashboard.organization.landing.courses_editor.title')}</h3>
      </div>
      
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="title">{t('dashboard.organization.landing.courses_editor.title_label')}</Label>
          <Input
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('dashboard.organization.landing.courses_editor.title_placeholder')}
          />
        </div>

        {/* Course Selection */}
        <div>
          <Label>{t('dashboard.organization.landing.courses_editor.select_courses')}</Label>
          <div className="space-y-4 mt-2">
            {courses ? (
              <div className="grid gap-4">
                {courses.map((course: any) => (
                  <div 
                    key={course.course_uuid} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                        {course.course_thumbnail && (
                           
                          <img 
                            src={course.course_thumbnail} 
                            alt={course.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{course.name}</h4>
                        <p className="text-sm text-gray-500">{course.description}</p>
                      </div>
                    </div>
                    <Button
                      variant={section.courses.includes(course.course_uuid) ? "default" : "outline"}
                      onClick={() => {
                        const newCourses = section.courses.includes(course.course_uuid)
                          ? section.courses.filter(id => id !== course.course_uuid)
                          : [...section.courses, course.course_uuid]
                        onChange({ ...section, courses: newCourses })
                      }}
                      className={section.courses.includes(course.course_uuid) ? "bg-black hover:bg-black/90" : ""}
                    >
                      {section.courses.includes(course.course_uuid) ? t('dashboard.organization.landing.courses_editor.selected') : t('dashboard.organization.landing.courses_editor.select')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t('dashboard.organization.landing.courses_editor.loading_courses')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrgEditLanding 