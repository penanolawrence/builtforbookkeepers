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

export const metadata: Metadata = {
  title: 'Sofia Books — AI-Assisted Bookkeeping for Philippine SMEs',
  description:
    'Take on more clients, not more hours. Sofia Books organizes receipts, sorts everything into an AI-powered review queue, and generates BIR books on demand. ₱999/month.',
  openGraph: {
    title: 'Sofia Books — AI-Assisted Bookkeeping for Philippine SMEs',
    description:
      'Take on more clients, not more hours. Sofia Books organizes receipts, sorts everything into an AI-powered review queue, and generates BIR books on demand.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <div className="ld-page">
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
