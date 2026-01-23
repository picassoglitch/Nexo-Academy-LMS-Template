'use client';

import React from 'react';
import {
  LandingAccentColorKey,
  LandingColoredTextSegment,
  LandingFaqSection,
} from './types'; // Ajusta la ruta si es necesario (o quita si es barrel file)
import useSWR from 'swr';
import { getOrgCourses } from '@services/courses/courses';
import { useLHSession } from '@components/Contexts/LHSessionContext';
import CourseThumbnailLanding from '@components/Objects/Thumbnails/CourseThumbnailLanding';
import UserAvatar from '@components/Objects/UserAvatar';
import { useTranslation } from 'react-i18next';
import Reveal from '@components/Objects/Reveal';
import { Badge } from '@components/ui/badge';
import toast from 'react-hot-toast';
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
} from 'lucide-react';
import Link from 'next/link';
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config';
import { getStripeProductCheckoutSession } from '@services/payments/products';

interface LandingCustomProps {
  landing: {
    sections: LandingSection[];
    enabled: boolean;
    schemaVersion?: LandingSchemaVersion;
    navbar?: {
      brandTitle: string;
      brandSubtitle: string;
      links: Array<{ label: string; href: string }>;
      ctaLabel: string;
      ctaHref: string;
    };
  };
  orgslug: string;
  orgId: number;
}

function LandingCustom({ landing, orgslug, orgId }: LandingCustomProps) {
  const { t } = useTranslation();
  const session = useLHSession() as any;
  const access_token = session?.data?.tokens?.access_token;
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Fetch all courses for the organization
  const { data: allCourses } = useSWR(
    orgslug ? [orgslug, access_token] : null,
    ([slug, token]) => getOrgCourses(slug, null, token)
  );

  React.useEffect(() => {
    // Sticky navbar visual effect only (no scrollTop manipulation)
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 8);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const colorClass = (key?: LandingAccentColorKey) => {
    switch (key) {
      case 'blue':
        return 'text-blue-600';
      case 'orange':
        return 'text-[#FF6200]';
      case 'green':
        return 'text-emerald-600';
      case 'purple':
        return 'text-purple-600';
      default:
        return 'text-gray-900';
    }
  };

  const renderSegments = (segments: LandingColoredTextSegment[]) => (
    <>
      {segments.map((seg, idx) => (
        <span key={idx} className={colorClass(seg.colorKey)}>
          {seg.text}
        </span>
      ))}
    </>
  );

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
  };

  const fallbackSections: LandingSection[] = React.useMemo(
    () => [
      // Tu fallbackSections completo aquí (lo copié del código original)
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
        primaryCta: { label: 'Empieza a ganar dinero', href: './diagnostico' },
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
          subtitle: 'Descubre cómo empezar a generar ingresos con IA en 7 días (con checklist y prompts).',
          emailPlaceholder: 'Tu email para recibir la guía',
          buttonLabel: 'Descargar Guía Gratis',
          microcopy: 'Sin spam. Puedes darte de baja cuando quieras.',
          badgeText: '+2,500 descargas esta semana',
        },
      },
      // ... (todas las otras sections del fallback, copia del original)
      // Para no hacer el mensaje eterno, asumo que copias el fallback completo del código original.
      // Si necesitas el fallback completo, dime y te lo doy en partes.
    ],
    []
  );

  const effectiveSections = landing.sections?.length ? landing.sections : fallbackSections;

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
    );

  // ... (el resto del código original: howItWorksIcon, stepBgClass, stepIconClass, normalizeVideoUrl, renderSection con todos los cases, etc.)

  return (
    <div className="w-full bg-white">
      {isV2Landing ? (
        <>
          {/* Premium sticky navbar (no scroll manipulation) */}
          <div
            className={`sticky top-0 z-50 w-full transition ${
              isScrolled ? 'bg-white/85 backdrop-blur-md border-b border-gray-200 shadow-xs' : 'bg-transparent'
            }`}
          >
            {/* ... navbar code del original */}
          </div>
          <main className="mx-auto flex w-full max-w-6xl flex-col bg-white">
            {effectiveSections.map((section) => renderSection(section))}
          </main>
        </>
      ) : (
        <div className="flex flex-col items-center justify-between w-full max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-16 h-full">
          {effectiveSections.map((section) => renderSection(section))}
        </div>
      )}
    </div>
  );
}

export default LandingCustom;
