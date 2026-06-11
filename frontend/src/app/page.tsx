import type { Metadata } from 'next'
import './landing.css'
import { LandingNav }          from '@/components/landing/LandingNav'
import { HeroSection }         from '@/components/landing/HeroSection'
import { ProblemsSection }     from '@/components/landing/ProblemsSection'
import { HowItWorksSection }   from '@/components/landing/HowItWorksSection'
import { FeaturesSection }     from '@/components/landing/FeaturesSection'
import { PricingSection }      from '@/components/landing/PricingSection'
import { FAQSection }          from '@/components/landing/FAQSection'
import { FinalCTA }            from '@/components/landing/FinalCTA'
import { LandingFooter }       from '@/components/landing/LandingFooter'
import { FAQS }                from '@/lib/faq-data'

// TODO: update when domain is confirmed
const SITE_URL = 'https://builtforbookkeepers.ph'

const TITLE       = 'Built for Bookkeepers — AI-Assisted Bookkeeping for Philippine SMEs'
const DESCRIPTION = 'Take on more clients, not more hours. Built for Bookkeepers organizes receipts, sorts everything into an AI-powered review queue, and generates BIR books on demand. ₱999/month.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'bookkeeping software Philippines',
    'BIR books generator',
    'accounting software Philippines',
    'BIR compliant bookkeeping',
    'SME bookkeeping Philippines',
    'cloud bookkeeping Philippines',
    'AI bookkeeping',
    'Philippine accounting firm software',
    'receipt management Philippines',
    'BIR loose-leaf books',
    'VAT computation Philippines',
    'bookkeeper app Philippines',
  ],
  authors: [{ name: 'Built for Bookkeepers', url: SITE_URL }],
  alternates: {
    canonical: SITE_URL,
  },
  // Geo tags — helps Google understand this is a Philippine-focused product
  other: {
    'geo.region':    'PH',
    'geo.country':   'Philippines',
    'geo.placename': 'Philippines',
    'DC.language':   'en-PH',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: SITE_URL,
    siteName: 'Built for Bookkeepers',
    locale: 'en_PH',
    images: [
      {
        // TODO: create this file at public/og-image.png (1200×630px)
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Built for Bookkeepers — AI-Assisted Bookkeeping for Philippine SMEs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    // Organization — enables Google Knowledge Panel + logo
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Built for Bookkeepers',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        // TODO: add public/logo.png (square, min 112×112px)
        url: `${SITE_URL}/logo.png`,
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        // TODO: update email when confirmed
        email: 'hello@builtforbookkeepers.ph',
        areaServed: 'PH',
        availableLanguage: ['English', 'Filipino'],
      },
      areaServed: {
        '@type': 'Country',
        name: 'Philippines',
      },
      // TODO: add your social media URLs here
      sameAs: [],
    },

    // WebSite — enables Google Sitelinks search box
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Built for Bookkeepers',
      inLanguage: 'en-PH',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },

    // SoftwareApplication — shows price + rating in search results
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'Built for Bookkeepers',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      inLanguage: 'en-PH',
      description:
        'AI-assisted bookkeeping software for Philippine accounting firms. Automates receipt classification, BIR book generation, and VAT computation.',
      offers: {
        '@type': 'Offer',
        price: '999',
        priceCurrency: 'PHP',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '999',
          priceCurrency: 'PHP',
          unitCode: 'MON',
        },
      },
      provider: { '@id': `${SITE_URL}/#organization` },
    },

    // FAQPage — FAQ answers expandable directly in Google results
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
}

export default function LandingPage() {
  return (
    <div className="ld-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
