import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AnalyticsSection } from "@/components/landing/AnalyticsSection";
import { AIAgentSection } from "@/components/landing/AIAgentSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, ready } = useAuth();

  useEffect(() => {
    if (ready && isAuthenticated) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [ready, isAuthenticated, navigate]);

  if (!ready || isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#262626] border-t-[#FFCD11] animate-spin" />
      </div>
    );
  }

  return (
    <main className="landing-page min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <AnalyticsSection />
      <AIAgentSection />
      <StatsSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
