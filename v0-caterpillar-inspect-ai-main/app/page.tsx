"use client"

import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { AnalyticsSection } from "@/components/analytics-section"
import { AIAgentSection } from "@/components/ai-agent-section"
import { StatsSection } from "@/components/stats-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AnalyticsSection />
      <AIAgentSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  )
}
