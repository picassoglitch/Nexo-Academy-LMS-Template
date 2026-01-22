export interface LandingBackground {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  colors?: Array<string>;
  direction?: string;
  image?: string;
}

/**
 * Landing schema versions:
 * - v1: legacy section-based custom landing (hero/text-and-image/logos/people/featured-courses)
 * - v2: "Nexus premium" landing with dedicated section types and a shared navbar config.
 */
export type LandingSchemaVersion = 1 | 2;

export interface LandingTestimonialContent {
  text: string;
  author: string;
}

export interface LandingImage {
  url: string;
  alt: string;
}

export interface LandingHeading {
  text: string;
  color: string;
  size: string;
}

export interface LandingButton {
  text: string;
  link: string;
  color: string;
  background: string;
}

export type LandingAccentColorKey = 'blue' | 'orange' | 'green' | 'purple' | 'neutral';

export interface LandingColoredTextSegment {
  text: string;
  colorKey?: LandingAccentColorKey;
}

export interface LandingNavbarLink {
  label: string;
  href: string; // can be an anchor like "#como-funciona" or any path
}

export interface LandingNavbarConfig {
  brandTitle: string; // e.g. "NEXUS"
  brandSubtitle: string; // e.g. "INTELIGENCIA ARTIFICIAL"
  links: LandingNavbarLink[];
  ctaLabel: string;
  ctaHref: string;
}

export interface LandingLogos {
  type: 'logos';
  title: string;
  logos: LandingImage[];
}

export interface LandingUsers {
  user_uuid: string;
  name: string;
  description: string;
  image_url: string;
  username?: string;
}

export interface LandingPeople {
  type: 'people';
  title: string;
  people: LandingUsers[];
}

export interface LandingTextAndImageSection {
  type: 'text-and-image';
  title: string;
  text: string;
  flow: 'left' | 'right';
  image: LandingImage;
  buttons: LandingButton[];
}

export interface LandingCourse {
  course_uuid: string;
}

export interface LandingFeaturedCourses {
  type: 'featured-courses';
  courses: LandingCourse[];
  title: string;
}

export interface LandingHeroSection {
  type: 'hero';
  title: string;
  background: LandingBackground;
  heading: LandingHeading;
  subheading: LandingHeading;
  buttons: LandingButton[];
  illustration?: {
    image: LandingImage;
    position: 'left' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    size: 'small' | 'medium' | 'large';
  };
  contentAlign?: 'left' | 'center' | 'right';
}

// ----------------------------
// v2 Premium Landing sections
// ----------------------------

export interface LandingHeroLeadMagnetSection {
  type: 'heroLeadMagnet';
  id?: string; // anchor id, default "inicio"
  headline: LandingColoredTextSegment[];
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  /**
   * Optional video embed URL for the hero card (YouTube/Vimeo embed URL).
   * Example: "https://www.youtube.com/embed/ABC123"
   */
  videoUrl?: string;
  /**
   * Hero video card copy controls (so admin can edit without code).
   * All fields are optional for backward compatibility.
   */
  videoCard?: {
    badgeText?: string; // e.g. "Video de 3 minutos"
    title?: string; // e.g. "¿Listo para generar ingresos reales con IA?"
    subtitle?: string; // descriptive line under title
    ctaLabel?: string; // button text under the video
  };
  leadMagnet: {
    title: string;
    subtitle: string;
    emailPlaceholder: string;
    buttonLabel: string;
    microcopy: string;
    badgeText: string;
  };
}

export interface LandingAboutSection {
  type: 'about';
  id?: string; // default "quienes-somos"
  title: string;
  headline: string;
  bullets: string[];
  videoLabel: string;
  body: string[]; // paragraphs
}

export interface LandingTestimonialCard {
  name: string;
  role: string;
  location?: string;
  quote: string;
  metricLabel: string;
  metricValue: string;
  colorKey?: LandingAccentColorKey;
}

export interface LandingTestimonialsGridSection {
  type: 'testimonialsGrid';
  title: string;
  items: LandingTestimonialCard[];
}

export interface LandingHowItWorksStep {
  title: string;
  body: string;
  iconKey: string; // mapped to lucide icon
  colorKey?: LandingAccentColorKey;
}

export interface LandingHowItWorksSection {
  type: 'howItWorks';
  id?: string; // default "como-funciona"
  title: string;
  steps: LandingHowItWorksStep[];
}

export interface LandingPricingFeature {
  text: string;
  state: 'included' | 'excluded';
}

export interface LandingPricingPlan {
  name: string;
  price: string;
  period: string;
  badge?: string; // e.g. "Más popular"
  accent?: LandingAccentColorKey;
  /**
   * Optional LearnHouse Payments product ID (used to start Stripe Checkout).
   * When set, the pricing button can redirect to the cart/checkout flow automatically.
   */
  productId?: number;
  features: LandingPricingFeature[];
  buttonLabel: string;
  buttonHref: string;
}

export interface LandingPricingSection {
  type: 'pricing';
  id?: string; // default "precios"
  title: string;
  subtitle: string;
  plans: LandingPricingPlan[];
  footerHighlights: string[];
}

export interface LandingTrustCard {
  title: string;
  body: string;
  iconKey: string;
}

export interface LandingTrustSection {
  type: 'trust';
  title: string;
  cards: LandingTrustCard[];
  trustRow: string[]; // e.g. ["Pago seguro", "Stripe", "SSL Encriptado"]
}

export interface LandingCommunitySection {
  type: 'community';
  id?: string; // default "comunidad"
  title: string;
  bullets: string[];
  testimonial: { quote: string; name: string; meta: string };
  buttonLabel: string;
  buttonHref: string;
}

export interface LandingFaqItem {
  q: string;
  a: string;
}

export interface LandingFaqSection {
  type: 'faq';
  id?: string; // default "faq"
  title: string;
  items: LandingFaqItem[];
}

export interface LandingFinalCtaSection {
  type: 'finalCta';
  title: LandingColoredTextSegment[];
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

export interface LandingFooterColumn {
  title: string;
  links: Array<{ label: string; href: string }>;
}

export interface LandingFooterSection {
  type: 'footer';
  columns: LandingFooterColumn[];
  newsletter: {
    title: string;
    placeholder: string;
    buttonLabel: string;
    microcopy: string;
  };
  copyright: string;
}

export type LandingSection =
  | LandingTextAndImageSection
  | LandingHeroSection
  | LandingLogos
  | LandingPeople
  | LandingFeaturedCourses
  | LandingHeroLeadMagnetSection
  | LandingAboutSection
  | LandingTestimonialsGridSection
  | LandingHowItWorksSection
  | LandingPricingSection
  | LandingTrustSection
  | LandingCommunitySection
  | LandingFaqSection
  | LandingFinalCtaSection
  | LandingFooterSection;

export interface LandingObject {
  sections: LandingSection[];
  enabled?: boolean;
  schemaVersion?: LandingSchemaVersion;
  navbar?: LandingNavbarConfig;
} 