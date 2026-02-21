'use client'

import React from 'react'
import useSWR from 'swr'
import type {
  LandingAccentColorKey,
  LandingColoredTextSegment,
  LandingFaqSection,
  LandingSchemaVersion,
  LandingSection,
} from '@components/Dashboard/Pages/Org/OrgEditLanding/landing_types'
import { getOrgCourses } from '@services/courses/courses'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import CourseThumbnailLanding from '@components/Objects/Thumbnails/CourseThumbnailLanding'
import UserAvatar from '@components/Objects/UserAvatar'
import { useTranslation } from 'react-i18next'
import Reveal from '@components/Objects/Reveal'
import { Badge } from '@components/ui/badge'
import toast from 'react-hot-toast'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LineChart,
  Lock,
  Rocket,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { getStripeProductCheckoutSession } from '@services/payments/products'

interface LandingCustomProps {
  landing: {
    sections: LandingSection[]
    enabled: boolean
    schemaVersion?: LandingSchemaVersion
    navbar?: {
      brandTitle: string
      brandSubtitle: string
      links: Array<{ label: string; href: string }>
      ctaLabel: string
      ctaHref: string
    }
  }
  orgslug: string
  orgId: number
}

function LandingCustom({ landing, orgslug, orgId }: LandingCustomProps) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [isScrolled, setIsScrolled] = React.useState(false)

  // Fetch all courses for the organization
  const { data: allCourses } = useSWR(
    orgslug ? [orgslug, access_token] : null,
    ([slug, token]) => getOrgCourses(slug, null, token)
  )

  React.useEffect(() => {
    // Sticky navbar visual effect only (no scrollTop manipulation)
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 8)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const colorClass = (key?: LandingAccentColorKey) => {
    switch (key) {
      case 'blue':
        return 'text-[#c9a84c]'
      case 'orange':
        return 'text-[#c9a84c]'
      case 'green':
        return 'text-emerald-400'
      case 'purple':
        return 'text-[#c9a84c]/80'
      default:
        return 'text-[#ede8d8]'
    }
  }

  const renderSegments = (segments: LandingColoredTextSegment[]) => (
    <>
      {segments.map((seg, idx) => (
        <span key={idx} className={colorClass(seg.colorKey)}>
          {seg.text}
        </span>
      ))}
    </>
  )

  const navbar = landing.navbar || {
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
    ctaHref: getUriWithoutOrg(`/login?orgslug=${encodeURIComponent(orgslug)}`),
  }

  /**
   * Fallback template:
   * If the org enabled the "BETA" landing (v2) but no sections are configured yet,
   * we render a complete Nexo-style, high-converting template immediately.
   *
   * IMPORTANT: This is only used when `landing.sections.length === 0`.
   * The dashboard editor still controls content once sections are added.
   */
  const fallbackSections: LandingSection[] = React.useMemo(
    () => [
      {
        type: 'heroLeadMagnet',
        id: 'inicio',
        headline: [
          { text: 'Aprende a usar IA para generar ', colorKey: 'neutral' },
          { text: 'ingresos reales', colorKey: 'blue' },
          { text: ' con guías probadas y una ', colorKey: 'neutral' },
          { text: 'comunidad que te respalda', colorKey: 'orange' },
        ],
        subtitle:
          'Educación práctica enfocada en ejecución. Únete hoy y sigue un sistema paso a paso para convertir ideas en ingresos con IA (en semanas, no meses).',
        // Primary CTA goes to the qualification quiz (relative to /orgs/[orgslug]/)
        primaryCta: { label: 'Empieza a ganar dinero', href: './diagnostico' },
        secondaryCta: { label: 'Ver Cómo Funciona', href: '#como-funciona' },
        // Configurable via dashboard (Hero + Video) when sections are added.
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
          subtitle: 'Descubre cómo empezar a generar ingresos con IA en 7 días (con checklist y prompts).',
          emailPlaceholder: 'Tu email para recibir la guía',
          buttonLabel: 'Descargar Guía Gratis',
          microcopy: 'Sin spam. Puedes darte de baja cuando quieras.',
          badgeText: '+2,500 descargas esta semana',
        },
      },
      {
        type: 'howItWorks',
        id: 'como-funciona',
        title: 'Cómo Funciona',
        steps: [
          {
            title: 'Aprendes',
            body: 'Entiendes lo que sí funciona con guías claras, ejemplos y casos reales.',
            iconKey: 'BookOpen',
            colorKey: 'blue',
          },
          {
            title: 'Implementas',
            body: 'Copias y adaptas prompts, plantillas y sistemas listos para usar.',
            iconKey: 'Zap',
            colorKey: 'orange',
          },
          {
            title: 'Ajustas',
            body: 'Mides, iteras y mejoras con un método simple para avanzar cada semana.',
            iconKey: 'LineChart',
            colorKey: 'green',
          },
          {
            title: 'Escalas',
            body: 'Automatizas y construyes un sistema que crece con comunidad y soporte.',
            iconKey: 'Rocket',
            colorKey: 'purple',
          },
        ],
      },
      {
        type: 'pricing',
        id: 'precios',
        title: 'Elige el plan y empieza hoy',
        subtitle:
          'Acceso inmediato. Pago seguro. Garantía de 30 días. Elige el nivel de soporte que necesitas para obtener resultados reales.',
        plans: [
          {
            name: 'Starter',
            price: '$397 MXN',
            period: '',
            features: [
              { text: 'Guías esenciales (inicio rápido)', state: 'included' },
              { text: 'Prompts base y plantillas', state: 'included' },
              { text: 'Comunidad privada', state: 'included' },
              { text: 'Sesiones en vivo', state: 'excluded' },
              { text: 'Soporte prioritario', state: 'excluded' },
            ],
            buttonLabel: 'Elegir Starter',
            buttonHref: '#',
          },
          {
            name: 'PRO',
            price: '$997 MXN',
            period: '',
            badge: 'Más popular',
            features: [
              { text: 'Todo en Starter', state: 'included' },
              { text: 'Plantillas avanzadas + flujos', state: 'included' },
              { text: 'Sesiones en vivo (Q&A)', state: 'included' },
              { text: 'Rutas guiadas por objetivo', state: 'included' },
              { text: 'Soporte prioritario', state: 'included' },
            ],
            buttonLabel: 'Elegir PRO',
            buttonHref: '#',
          },
          {
            name: 'Operator',
            price: '$3,997 MXN',
            period: '',
            features: [
              { text: 'Todo en PRO', state: 'included' },
              { text: 'Acompañamiento para operadores', state: 'included' },
              { text: 'Revisión de implementación', state: 'included' },
              { text: 'SOPs y sistemas (operación)', state: 'included' },
              { text: 'Onboarding 1:1', state: 'included' },
            ],
            buttonLabel: 'Elegir Operator',
            buttonHref: '#',
          },
        ],
        footerHighlights: ['Garantía 30 días', 'Acceso inmediato', 'Pago seguro'],
      },
      {
        type: 'testimonialsGrid',
        title: 'Historias de Éxito',
        items: [
          {
            name: 'Mariana G.',
            role: 'Emprendedora',
            location: 'CDMX',
            quote:
              'En dos semanas ya tenía un servicio claro, un guion de ventas y mis primeros leads. La comunidad empuja a ejecutar.',
            metricLabel: 'Resultado',
            metricValue: '$500 USD en 45 días',
            colorKey: 'green',
          },
          {
            name: 'Carlos R.',
            role: 'Freelancer',
            location: 'Guadalajara',
            quote:
              'Dejé de "investigar" y empecé a implementar. Ajusté mi oferta con IA y cerré clientes recurrentes.',
            metricLabel: 'Resultado',
            metricValue: '5 clientes recurrentes',
            colorKey: 'blue',
          },
          {
            name: 'Fernanda L.',
            role: 'Marketer',
            location: 'Monterrey',
            quote:
              'Las plantillas me ahorran horas. Ahora pruebo, mido y optimizo sin perderme en herramientas.',
            metricLabel: 'Resultado',
            metricValue: '+32% conversion en 3 semanas',
            colorKey: 'orange',
          },
          {
            name: 'Iván S.',
            role: 'Operador',
            location: 'Puebla',
            quote:
              'No es teoría. Es un sistema. En semanas ya tenía un proceso de adquisición y seguimiento automatizado.',
            metricLabel: 'Resultado',
            metricValue: 'Sistema listo en 10 días',
            colorKey: 'purple',
          },
        ],
      },
      {
        type: 'about',
        id: 'quienes-somos',
        title: 'Quiénes Somos',
        headline: 'Educación práctica para resultados reales (sin humo)',
        bullets: [
          'Metodología enfocada en ejecución (paso a paso)',
          'Contenido accionable con ejemplos reales',
          'Comunidad moderada para feedback y accountability',
          'Garantía de 30 días para que pruebes sin riesgo',
        ],
        videoLabel: 'Video: Conoce cómo funciona Nexo (próximamente)',
        body: [
          'Creamos Nexo para personas que quieren usar IA de forma práctica y medible. Aquí no vendemos "secretos": te damos un sistema claro para aprender, implementar y escalar.',
          'Únete hoy y avanza con claridad, soporte y una comunidad que ejecuta.',
        ],
      },
      {
        type: 'trust',
        title: 'Por Qué Confiar',
        cards: [
          { title: 'Enfoque global', body: 'Principios y estrategias que funcionan en múltiples industrias.', iconKey: 'Globe' },
          { title: 'Ejecución real', body: 'Menos teoría, más implementación con pasos concretos.', iconKey: 'CheckCircle2' },
          { title: 'Sin afiliados', body: 'Sin conflictos de interés: recomendaciones por utilidad, no por comisión.', iconKey: 'Ban' },
          { title: 'Contenido actualizado', body: 'Mejoras constantes para mantenerte al día con IA.', iconKey: 'Sparkles' },
          { title: 'Comunidad moderada', body: 'Feedback, accountability y reglas claras para avanzar.', iconKey: 'Users' },
          { title: 'Garantía 30 días', body: 'Pruébalo sin riesgo y decide con confianza.', iconKey: 'ShieldCheck' },
        ],
        trustRow: ['Pago seguro', 'Stripe', 'SSL Encriptado', 'Soporte humano'],
      },
      {
        type: 'community',
        id: 'comunidad',
        title: 'Comunidad Privada (Acceso inmediato)',
        bullets: [
          'Resuelve dudas rápido y evita quedarte atorado',
          'Feedback para mejorar tu oferta, anuncios y procesos',
          'Accountability para lograr resultados en semanas',
          'Recursos compartidos (prompts, plantillas y mejoras)',
        ],
        testimonial: {
          quote: 'Aquí dejé de postergar. Cada semana avanzo con claridad y feedback.',
          name: 'Miembro PRO',
          meta: 'Comunidad privada',
        },
        buttonLabel: 'Quiero acceso a la comunidad',
        buttonHref: '#precios',
      },
      {
        type: 'faq',
        id: 'faq',
        title: 'Preguntas Frecuentes',
        items: [
          { q: '¿Cuándo obtengo acceso?', a: 'Inmediatamente después del pago confirmado.' },
          { q: '¿La garantía es real?', a: 'Sí. Tienes 30 días para probar. Revisa los términos aplicables a tu plan.' },
          { q: '¿Necesito experiencia previa con IA?', a: 'No. Empezamos desde lo esencial y avanzamos a implementación real.' },
          { q: '¿Esto sirve si tengo poco tiempo?', a: 'Sí. El sistema está diseñado para avanzar con tareas semanales claras.' },
          { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, puedes cancelar tu suscripción cuando quieras.' },
          { q: '¿Cómo recibo soporte?', a: 'Dentro de la comunidad, recursos del programa y (según plan) soporte prioritario.' },
        ],
      },
      {
        type: 'finalCta',
        title: [
          { text: 'Únete hoy y consigue ', colorKey: 'neutral' },
          { text: 'resultados reales', colorKey: 'green' },
          { text: ' con IA ', colorKey: 'neutral' },
          { text: 'en semanas', colorKey: 'orange' },
          { text: '.', colorKey: 'neutral' },
        ],
        subtitle:
          'Acceso inmediato + comunidad privada + garantía 30 días. Elige tu plan y empieza ahora.',
        primaryCta: { label: 'Empezar ahora', href: '#precios' },
        secondaryCta: { label: 'Ver Cómo Funciona', href: '#como-funciona' },
      },
    ],
    []
  )

  const effectiveSections = landing.sections?.length ? landing.sections : fallbackSections

  const isV2Landing =
    landing.schemaVersion === 2 ||
    landing.sections.some((s) =>
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
      ].includes(s.type)
    )

  const howItWorksIcon = (iconKey?: string) => {
    switch (iconKey) {
      case 'BookOpen':
        return BookOpen
      case 'Zap':
        return Zap
      case 'LineChart':
        return LineChart
      case 'Rocket':
        return Rocket
      default:
        // Back-compat with older defaults/configs
        return Sparkles
    }
  }

  const stepBgClass = (_key?: LandingAccentColorKey) => {
    return 'bg-[#c9a84c]/10'
  }

  const stepIconClass = (_key?: LandingAccentColorKey) => {
    return 'text-[#c9a84c]'
  }

  const normalizeVideoUrl = (rawUrl?: string) => {
    const fallback = 'https://www.youtube.com/embed/ABC123'
    const input = (rawUrl || '').trim()
    if (!input) return { kind: 'embed' as const, url: fallback }

    // Already an embed URL?
    if (/youtube\.com\/embed|player\.vimeo\.com\/video/i.test(input)) {
      return { kind: 'embed' as const, url: input }
    }

    try {
      // Support relative URLs (e.g. /content/orgs/.../landing/<file>)
      const base =
        typeof window !== 'undefined' ? window.location.href : 'http://localhost'
      const u = new URL(input, base)
      const host = u.hostname.toLowerCase()
      const path = u.pathname

      // YouTube watch links → embed
      if (host.includes('youtube.com')) {
        const v = u.searchParams.get('v')
        if (path === '/watch' && v) {
          return { kind: 'embed' as const, url: `https://www.youtube.com/embed/${v}` }
        }
      }
      // youtu.be/<id> → embed
      if (host === 'youtu.be') {
        const id = path.replace('/', '').trim()
        if (id) {
          return { kind: 'embed' as const, url: `https://www.youtube.com/embed/${id}` }
        }
      }
      // Vimeo page URL → embed
      if (host.includes('vimeo.com') && !host.includes('player.vimeo.com')) {
        const match = path.match(/\/(\d+)/)
        const id = match?.[1]
        if (id) {
          return { kind: 'embed' as const, url: `https://player.vimeo.com/video/${id}` }
        }
      }
    } catch {
      // Ignore and fall through
    }

    // Otherwise treat as direct media file URL for <video> (e.g., uploaded MP4/WebM)
    return { kind: 'file' as const, url: input }
  }

  const renderSection = (section: LandingSection) => {
    switch (section.type) {
      // -------------------
      // v2: premium landing
      // -------------------
      case 'heroLeadMagnet': {
        const normalizedVideo = normalizeVideoUrl(section.videoUrl)
        const videoBadge = section.videoCard?.badgeText || 'Video de 3 minutos'
        const videoTitle = section.videoCard?.title || '¿Listo para generar ingresos reales con IA?'
        const videoSubtitle =
          section.videoCard?.subtitle ||
          'Mira este video de 3 minutos y descubre cómo emprendedores como tú ya están facturando miles de pesos extra al mes.'
        const videoCtaLabel = section.videoCard?.ctaLabel || 'Empieza a ganar dinero ahora'

        return (
          <section key="heroLeadMagnet" id={section.id || 'inicio'} className="w-full pt-10 sm:pt-14">
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-[0px_4px_40px_rgba(0,0,0,0.6)]">
                {/* subtle blob background */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#c9a84c]/5 blur-3xl" />
                  <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#c9a84c]/5 blur-3xl" />
                </div>

                <div className="relative grid grid-cols-1 gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:gap-12">
                  {/* Left */}
                  <div className="flex flex-col justify-center">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-3 py-1 text-xs font-bold text-[#c9a84c]">
                        Resultados reales
                      </span>
                      <span className="inline-flex items-center rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/5 px-3 py-1 text-xs font-bold text-[#c9a84c]/80">
                        En semanas, no meses
                      </span>
                      <span className="inline-flex items-center rounded-full border border-emerald-700/30 bg-emerald-900/20 px-3 py-1 text-xs font-bold text-emerald-400">
                        Garantía 30 días
                      </span>
                    </div>
                    <h1 className="text-3xl leading-tight sm:text-5xl sm:leading-tight font-extrabold tracking-tight text-[#ede8d8]">
                      {renderSegments(section.headline)}
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-white/60 leading-relaxed">
                      {section.subtitle}
                    </p>

                    <div className="mt-7 flex flex-col sm:flex-row gap-3">
                      <a
                        href={section.primaryCta.href}
                        className="inline-flex items-center justify-center rounded-xl bg-[#c9a84c] px-6 py-3 font-extrabold text-[#0a0a0a] shadow-sm hover:bg-[#b8933f] focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30"
                      >
                        {section.primaryCta.label}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </a>
                      <a
                        href={section.secondaryCta.href}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-[#ede8d8] shadow-sm hover:bg-white/10 focus:outline-hidden focus:ring-2 focus:ring-white/20"
                      >
                        {section.secondaryCta.label}
                      </a>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50">
                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Pago seguro
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#c9a84c]" />
                        Guías probadas y actualizadas
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Comunidad privada
                      </span>
                    </div>
                  </div>

                  {/* Right: video card */}
                  <div className="flex items-center justify-center">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-[0px_4px_30px_rgba(0,0,0,0.5)]">
                      <div className="bg-linear-to-br from-[#1c1408] to-[#0a0a0a] border-b border-[#c9a84c]/20 px-6 py-5 text-white">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-3 py-1 text-xs font-extrabold tracking-wide text-[#c9a84c]">
                          <Sparkles className="h-3.5 w-3.5" />
                          {videoBadge}
                        </div>
                        <div className="mt-3 text-xl font-extrabold leading-snug text-[#ede8d8]">
                          {videoTitle}
                        </div>
                        <div className="mt-2 text-sm text-white/60 leading-relaxed">
                          {videoSubtitle}
                        </div>
                      </div>

                      <div className="p-6 sm:p-7">
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                          {/* Video URL is configurable in the dashboard (Hero + Video). */}
                          <div className="relative w-full pt-[56.25%]">
                            {normalizedVideo.kind === 'embed' ? (
                              <iframe
                                className="absolute inset-0 h-full w-full"
                                src={normalizedVideo.url}
                                title="Video: cómo funciona"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                              />
                            ) : (
                              <video
                                className="absolute inset-0 h-full w-full"
                                src={normalizedVideo.url}
                                controls
                                playsInline
                                preload="metadata"
                              />
                            )}
                          </div>
                        </div>

                        <a
                          href={section.primaryCta.href}
                          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#c9a84c] px-6 font-extrabold text-[#0a0a0a] shadow-sm hover:bg-[#b8933f] focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30"
                        >
                          {videoCtaLabel}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </a>

                        {/* TODO: If you want to capture emails from this hero, wire a real provider here (Brevo/Resend/Mailchimp/etc.). */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        )
      }
      case 'about': {
        return (
          <section key="about" id={section.id || 'quienes-somos'} className="w-full py-14 sm:py-20">
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ede8d8]">
                {section.title}
              </h2>

              <div className="mt-10 rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-10 shadow-[0px_4px_30px_rgba(0,0,0,0.4)]">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-[#c9a84c]" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#ede8d8]">{section.headline}</h3>
                      <ul className="mt-4 space-y-2">
                        {section.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-white/70">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                            <span className="text-sm sm:text-base">{b}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 inline-flex items-center rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-white/60">
                        {section.videoLabel}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-white/60 leading-relaxed">
                    {section.body.map((p, idx) => (
                      <p key={idx} className="text-sm sm:text-base">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        )
      }
      case 'testimonialsGrid': {
        return (
          <section key="testimonialsGrid" className="w-full py-14 sm:py-20">
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ede8d8]">
                {section.title}
              </h2>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {section.items.slice(0, 4).map((it, idx) => {
                  const initials = it.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join('')
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm hover:-translate-y-1 hover:shadow-[0px_4px_20px_rgba(201,168,76,0.1)] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center font-extrabold text-[#c9a84c]">
                          {initials || 'NA'}
                        </div>
                        <div>
                          <div className="font-bold text-[#ede8d8]">{it.name}</div>
                          <div className="text-xs text-white/50">
                            {it.role}
                            {it.location ? ` · ${it.location}` : ''}
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-white/60 leading-relaxed">"{it.quote}"</p>
                      <div className="mt-4 rounded-xl bg-[#0a0a0a] border border-white/5 p-4">
                        <div className="text-xs text-white/40">{it.metricLabel}</div>
                        <div className={`text-lg font-extrabold ${colorClass(it.colorKey)}`}>{it.metricValue}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Reveal>
          </section>
        )
      }
      case 'howItWorks': {
        return (
          <section key="howItWorks" id={section.id || 'como-funciona'} className="w-full py-14 sm:py-20">
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ede8d8]">
                {section.title}
              </h2>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {section.steps.slice(0, 4).map((step, idx) => {
                  const Icon = howItWorksIcon(step.iconKey)
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm hover:-translate-y-1 hover:shadow-[0px_4px_20px_rgba(201,168,76,0.1)] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-11 w-11 rounded-2xl ${stepBgClass(step.colorKey)} border border-white/10 flex items-center justify-center`}
                          aria-hidden
                        >
                          <Icon className={`h-5 w-5 ${stepIconClass(step.colorKey)}`} />
                        </div>
                        <div className="text-sm font-extrabold text-[#ede8d8]">
                          {idx + 1}. {step.title}
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-white/60 leading-relaxed">{step.body}</div>
                    </div>
                  )
                })}
              </div>
            </Reveal>
          </section>
        )
      }
      case 'pricing': {
        return (
          <section key="pricing" className="w-full py-14 sm:py-20">
            {/* Map Programas anchor to pricing (requested anchors include both) */}
            <div id="programas" />
            <div id={section.id || 'precios'} />
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ede8d8]">
                {section.title}
              </h2>
              <p className="mt-3 text-center text-white/60">{section.subtitle}</p>

              <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {section.plans.map((plan, idx) => {
                  const isPro = Boolean(plan.badge)
                  const isStarter = plan.name?.toLowerCase() === 'starter'
                  const isOperator = plan.name?.toLowerCase() === 'operator'
                  const rawLabel = (plan.buttonLabel || '').trim()
                  const legacyLabels = new Set([
                    '',
                    'Empezar',
                    'Empezar hoy',
                    'Empezar con Starter',
                    'Elegir PRO',
                    'Elegir PRO ',
                    'Unirme al plan más popular',
                    'Elegir',
                    'Elegir Plan',
                    'Hablar con ventas',
                    'Quiero acompañamiento',
                    'Reservar mi acompañamiento',
                  ])
                  const ctaLabel = legacyLabels.has(rawLabel) ? `Elegir ${plan.name}` : rawLabel
                  const checkoutHref =
                    plan.productId && plan.productId > 0
                      ? `/payments/stripe/checkout/start?org_id=${encodeURIComponent(
                          String(orgId)
                        )}&product_id=${encodeURIComponent(String(plan.productId))}&orgslug=${encodeURIComponent(
                          orgslug
                        )}&return_to=${encodeURIComponent('/?orgslug=' + orgslug)}`
                      : null
                  return (
                    <div
                      key={idx}
                      className={`relative rounded-2xl border p-6 sm:p-8 shadow-sm transition hover:shadow-[0px_4px_30px_rgba(201,168,76,0.15)] ${
                        isPro
                          ? 'border-2 border-[#c9a84c] bg-[#c9a84c]/5 ring-1 ring-[#c9a84c]/20'
                          : 'border-white/10 bg-[#111111]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-extrabold text-[#ede8d8]">{plan.name}</div>
                        {plan.badge ? (
                          <Badge className="border border-[#c9a84c]/40 bg-[#c9a84c]/15 text-[#c9a84c] text-sm px-3 py-1 font-extrabold">
                            {plan.badge}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-extrabold text-[#ede8d8]">{plan.price}</span>
                        {plan.period ? <span className="ml-2 text-sm text-white/50">{plan.period}</span> : null}
                        {isPro ? (
                          <div className="mt-2 text-sm font-semibold text-white/60">
                            El plan elegido por el 87% de nuestros miembros
                          </div>
                        ) : null}
                        {/* Optional (if Stripe installments/MSI is enabled): add a small "MSI" line here per plan.
                            Example: Starter → "o en 6 MSI desde ~$66/mes", PRO → "~$166/mes", Operator → "~$666/mes" */}
                      </div>

                      <ul className="mt-6 space-y-3">
                        {plan.features.map((f, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            {f.state === 'included' ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                            ) : (
                              <XCircle className="mt-0.5 h-5 w-5 text-white/20" />
                            )}
                            <span
                              className={`text-sm ${
                                f.state === 'included' ? 'text-white/70' : 'text-white/30'
                              }`}
                            >
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <a
                        href={checkoutHref || plan.buttonHref}
                        className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#c9a84c] px-5 py-3 font-extrabold text-[#0a0a0a] shadow-sm hover:bg-[#b8933f] focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30"
                      >
                        {ctaLabel}
                      </a>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
                {section.footerHighlights.map((h, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {h}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-white/60">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <CreditCard className="h-4 w-4 text-white/50" />
                  Stripe
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Pago seguro
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <Lock className="h-4 w-4 text-[#c9a84c]" />
                  SSL
                </span>
              </div>
            </Reveal>
          </section>
        )
      }
      case 'trust': {
        return (
          <section key="trust" className="w-full py-14 sm:py-20">
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ede8d8]">
                {section.title}
              </h2>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {section.cards.slice(0, 6).map((c, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm hover:-translate-y-1 hover:shadow-[0px_4px_20px_rgba(201,168,76,0.1)] transition"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-[#c9a84c]" />
                    </div>
                    <div className="mt-4 font-bold text-[#ede8d8]">{c.title}</div>
                    <div className="mt-2 text-sm text-white/60">{c.body}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-white/60">
                {section.trustRow.map((x, idx) => (
                  <span key={idx} className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    {x}
                  </span>
                ))}
              </div>
            </Reveal>
          </section>
        )
      }
      case 'community': {
        return (
          <section key="community" id={section.id || 'comunidad'} className="w-full py-14 sm:py-20">
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#111111] p-6 sm:p-10 shadow-[0px_4px_30px_rgba(201,168,76,0.08)]">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#ede8d8]">{section.title}</h2>
                    <ul className="mt-6 space-y-3">
                      {section.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/70">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                          <span className="text-sm sm:text-base">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={section.buttonHref}
                      className="mt-7 inline-flex items-center justify-center rounded-xl bg-[#c9a84c] px-6 py-3 font-extrabold text-[#0a0a0a] shadow-sm hover:bg-[#b8933f] focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30"
                    >
                      {section.buttonLabel}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </a>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
                    <div className="text-sm text-white/60">"{section.testimonial.quote}"</div>
                    <div className="mt-4 font-bold text-[#ede8d8]">{section.testimonial.name}</div>
                    <div className="text-xs text-white/40">{section.testimonial.meta}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        )
      }
      case 'faq': {
        const faq = section as LandingFaqSection
        return (
          <section key="faq" id={faq.id || 'faq'} className="w-full py-14 sm:py-20">
            <Reveal className="mx-auto max-w-4xl px-4 sm:px-6">
              <h2 className="text-center text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ede8d8]">
                {faq.title}
              </h2>
              <div className="mt-10 rounded-2xl border border-white/10 bg-[#111111] p-2 sm:p-4 shadow-sm">
                <div className="w-full">
                  {faq.items.map((item, idx) => (
                    <details key={idx} className="group border-b border-white/5 px-2">
                      <summary className="cursor-pointer list-none py-4 text-left font-bold text-[#ede8d8] focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30 rounded-md">
                        <span>{item.q}</span>
                        <span className="float-right text-white/40 group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <div className="pb-4 text-white/60">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )
      }
      case 'finalCta': {
        return (
          <section key="finalCta" className="w-full py-14 sm:py-20">
            <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#111111] p-8 sm:p-12 shadow-[0px_4px_40px_rgba(201,168,76,0.1)]">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ede8d8]">
                  {renderSegments(section.title)}
                </h2>
                <p className="mt-3 text-white/60">{section.subtitle}</p>
                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <a
                    href={section.primaryCta.href}
                    className="inline-flex items-center justify-center rounded-xl bg-[#c9a84c] px-6 py-3 font-extrabold text-[#0a0a0a] shadow-sm hover:bg-[#b8933f] focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30"
                  >
                    {section.primaryCta.label}
                  </a>
                  <a
                    href={section.secondaryCta.href}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-[#ede8d8] shadow-sm hover:bg-white/10 focus:outline-hidden focus:ring-2 focus:ring-white/20"
                  >
                    {section.secondaryCta.label}
                  </a>
                </div>
              </div>
            </Reveal>
          </section>
        )
      }
      case 'footer': {
        return (
          <footer key="footer" className="w-full">
            <div className="bg-gray-950 text-white">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                  {section.columns.map((col, idx) => (
                    <div key={idx}>
                      <div className="font-bold">{col.title}</div>
                      <ul className="mt-4 space-y-2 text-sm text-white/80">
                        {col.links.map((l, lIdx) => (
                          <li key={lIdx}>
                            <a className="hover:text-white focus:outline-hidden focus:ring-2 focus:ring-white/20 rounded" href={l.href}>
                              {l.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div>
                    <div className="font-bold">{section.newsletter.title}</div>
                    <div className="mt-4 flex gap-2">
                      <input
                        className="h-11 flex-1 rounded-xl bg-white/10 border border-white/15 px-3 text-sm outline-hidden focus:ring-2 focus:ring-white/20"
                        placeholder={section.newsletter.placeholder}
                      />
                      <button className="h-11 rounded-xl bg-white text-gray-900 px-4 font-bold hover:bg-white/90">
                        {section.newsletter.buttonLabel}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-white/60">{section.newsletter.microcopy}</div>
                  </div>
                </div>
                <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/60">
                  {section.copyright}
                </div>
              </div>
            </div>
          </footer>
        )
      }

      case 'hero':
        return (
          <div
            key={`hero-${section.title}`}
            className="min-h-[400px] sm:min-h-[500px] mt-[20px] sm:mt-[40px] mx-2 sm:mx-4 lg:mx-16 w-full flex items-center justify-center rounded-xl border border-white/10"
            style={{
              background: section.background.type === 'solid' 
                ? section.background.color 
                : section.background.type === 'gradient'
                ? `linear-gradient(${section.background.direction || '45deg'}, ${section.background.colors?.join(', ')})`
                : `url(${section.background.image}) center/cover`
            }}
          >
            <div className={`w-full h-full flex flex-col sm:flex-row ${
              section.illustration?.position === 'right' ? 'sm:flex-row-reverse' : 'sm:flex-row'
            } items-stretch`}>
              {/* Logo */}
              {section.illustration?.image.url && (
                <div className={`flex items-${section.illustration.verticalAlign} p-6 w-full ${
                  section.illustration.size === 'small' ? 'sm:w-1/4' :
                  section.illustration.size === 'medium' ? 'sm:w-1/3' :
                  'sm:w-2/5'
                }`}>
                  <img
                    src={section.illustration.image.url}
                    alt={section.illustration.image.alt}
                    className="w-full object-contain"
                  />
                </div>
              )}

              {/* Content */}
              <div className={`flex-1 flex items-center ${
                section.contentAlign === 'left' ? 'justify-start text-left' :
                section.contentAlign === 'right' ? 'justify-end text-right' :
                'justify-center text-center'
              } p-6`}>
                <div className="max-w-2xl">
                  <h1 
                    className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4"
                    style={{ color: section.heading.color }}
                  >
                    {section.heading.text}
                  </h1>
                  <h2
                    className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 font-medium"
                    style={{ color: section.subheading.color }}
                  >
                    {section.subheading.text}
                  </h2>
                  <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 ${
                    section.contentAlign === 'left' ? 'justify-start' :
                    section.contentAlign === 'right' ? 'justify-end' :
                    'justify-center'
                  } items-center`}>
                    {section.buttons.map((button, index) => (
                      <a
                        key={index}
                        href={button.link}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-extrabold shadow-sm transition-transform hover:scale-105"
                        style={{
                          backgroundColor: button.background,
                          color: button.color
                        }}
                      >
                        {button.text}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'text-and-image':
        return (
          <div 
            key={`text-image-${section.title}`}
            className="py-16 mx-2 sm:mx-4 lg:mx-16 w-full"
          >
            <div className={`flex flex-col md:flex-row items-center gap-8 md:gap-12 bg-[#111111] border border-white/10 rounded-xl p-6 md:p-8 lg:p-12 nice-shadow ${
              section.flow === 'right' ? 'md:flex-row-reverse' : ''
            }`}>
              <div className="flex-1 w-full max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#ede8d8] tracking-tight">{section.title}</h2>
                <div className="prose prose-lg prose-invert max-w-none">
                  <p className="text-base md:text-lg leading-relaxed text-white/60 whitespace-pre-line">
                    {section.text}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 mt-8">
                  {section.buttons.map((button, index) => (
                    <a
                      key={index}
                      href={button.link}
                      className="px-6 py-3 rounded-xl font-medium shadow-xs transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: button.background,
                        color: button.color
                      }}
                    >
                      {button.text}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full md:w-auto">
                <div className="relative w-full max-w-[500px] mx-auto px-4 md:px-8">
                  <div className="relative w-full aspect-4/3">
                    {section.image?.url ? (
                      <img
                        src={section.image.url}
                        alt={section.image.alt || ""}
                        className="object-contain w-full h-full rounded-lg"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'logos':
        return (
          <div 
            key={`logos-${section.type}`}
            className="py-16 mx-2 sm:mx-4 lg:mx-16 w-full"
          >
            {section.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-left mb-16 text-[#ede8d8]">{section.title}</h2>
            )}
            <div className="flex justify-center w-full">
              <div className="flex flex-wrap justify-center gap-16 max-w-7xl">
                {section.logos.map((logo, index) => (
                  <div key={index} className="flex items-center justify-center w-[220px] h-[120px]">
                    <img
                      src={logo.url}
                      alt={logo.alt}
                      className="max-h-24 max-w-[200px] object-contain hover:opacity-80 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'people':
        return (
          <div 
            key={`people-${section.title}`}
            className="py-16 mx-2 sm:mx-4 lg:mx-16 w-full"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-left mb-10 text-[#ede8d8]">{section.title}</h2>
            <div className="flex flex-wrap justify-center gap-x-20 gap-y-8">
              {section.people.map((person, index) => (
                <div key={index} className="w-[140px] flex flex-col items-center">
                  <div className="w-24 h-24 mb-4">
                    {person.username ? (
                      <UserAvatar
                        username={person.username}
                        width={96}
                        rounded="rounded-full"
                        border="border-4"
                        showProfilePopup
                      />
                    ) : (
                      <img
                        src={person.image_url}
                        alt={person.name}
                        className="w-full h-full rounded-full object-cover border-4 border-[#c9a84c]/30 nice-shadow"
                      />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-center text-[#ede8d8]">{person.name}</h3>
                  <p className="text-sm text-center text-white/60 mt-1">{person.description}</p>
                </div>
              ))}
            </div>
          </div>
        )
      case 'featured-courses':
        if (!allCourses) {
          return (
            <div 
              key={`featured-courses-${section.title}`}
              className="py-16 mx-2 sm:mx-4 lg:mx-16 w-full"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-left mb-6 text-[#ede8d8]">{section.title}</h2>
              <div className="text-center py-6 text-white/50">{t('courses.loading_courses')}</div>
            </div>
          )
        }

        const featuredCourses = allCourses.filter((course: any) => 
          section.courses.includes(course.course_uuid)
        )

        return (
          <div 
            key={`featured-courses-${section.title}`}
            className="py-16 mx-2 sm:mx-4 lg:mx-16 w-full"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-left mb-6 text-[#ede8d8]">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
              {featuredCourses.map((course: any) => (
                <div key={course.course_uuid} className="w-full flex justify-center">
                  <CourseThumbnailLanding
                    course={course}
                    orgslug={orgslug}
                  />
                </div>
              ))}
              {featuredCourses.length === 0 && (
                <div className="col-span-full text-center py-6 text-white/50">
                  {t('courses.no_featured_courses')}
                </div>
              )}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full bg-[#0a0a0a]">
      {isV2Landing ? (
        <>
          {/* Premium sticky navbar (no scroll manipulation) */}
          <div
            className={`sticky top-0 z-50 w-full transition ${
              isScrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5 shadow-[0px_4px_24px_rgba(0,0,0,0.5)]' : 'bg-transparent'
            }`}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
              <a
                href="#inicio"
                className="flex items-baseline gap-2 focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30 rounded shrink-0"
              >
                <span className="text-lg font-extrabold tracking-tight text-[#ede8d8]">{navbar.brandTitle}</span>
                <span className="text-xs font-semibold tracking-wide text-white/40">{navbar.brandSubtitle}</span>
              </a>
              <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold text-white/60 overflow-x-auto whitespace-nowrap px-1 grow">
                {navbar.links.map((l, idx) => (
                  <a
                    key={idx}
                    href={l.href}
                    className="hover:text-[#c9a84c] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30 rounded px-1"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="flex items-center gap-3 shrink-0">
                {session.status === 'unauthenticated' && (
                  <Link
                    href={navbar.ctaHref}
                    className="inline-flex items-center justify-center rounded-xl bg-[#c9a84c] px-4 py-2 text-sm font-extrabold text-[#0a0a0a] shadow-sm hover:bg-[#b8933f] focus:outline-hidden focus:ring-2 focus:ring-[#c9a84c]/30"
                  >
                    {navbar.ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <main className="mx-auto flex w-full max-w-6xl flex-col bg-[#0a0a0a]">
            {effectiveSections.map((section) => renderSection(section))}
          </main>
        </>
      ) : (
        <div className="flex flex-col items-center justify-between w-full max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-16 h-full">
          {effectiveSections.map((section) => renderSection(section))}
        </div>
      )}
    </div>
  )
}

export default LandingCustom