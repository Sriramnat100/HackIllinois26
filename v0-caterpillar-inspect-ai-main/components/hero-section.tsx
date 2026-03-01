"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown } from "lucide-react"

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const sectionHeight = sectionRef.current.offsetHeight
      const progress = Math.min(
        Math.max(-rect.top / (sectionHeight - window.innerHeight), 0),
        1
      )
      setScrollProgress(progress)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const bulldozerX = -20 + scrollProgress * 120
  const bulldozerScale = 0.8 + scrollProgress * 0.3
  const textOpacity = 1 - scrollProgress * 2.5
  const textY = scrollProgress * -80
  const dustOpacity = Math.min(scrollProgress * 3, 0.6)
  const trackWidth = scrollProgress * 100

  return (
    <section ref={sectionRef} className="relative h-[250vh]" aria-label="Hero">
      <div className="sticky top-0 h-screen overflow-hidden bg-background">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#FFCD11 1px, transparent 1px), linear-gradient(90deg, #FFCD11 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
          aria-hidden="true"
        />

        {/* Hero text */}
        <div
          className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center"
          style={{
            opacity: Math.max(textOpacity, 0),
            transform: `translateY(${textY}px)`,
          }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              AI-Powered Inspection Platform
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground tracking-tight font-serif text-balance max-w-5xl">
            Inspect Smarter.
            <br />
            <span className="text-primary">Build Safer.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed text-pretty">
            The AI inspection platform that rides alongside your crew.
            Smart glasses, real-time analytics, and an AI agent that
            generates full reports — making inspectors 5x more efficient.
          </p>

          <div className="mt-10 flex items-center gap-2 text-muted-foreground animate-bounce">
            <ArrowDown className="h-5 w-5" />
            <span className="text-sm">Scroll to explore</span>
          </div>
        </div>

        {/* Bulldozer track marks */}
        <div
          className="absolute bottom-28 left-0 h-4 z-10"
          style={{
            width: `${trackWidth}%`,
            opacity: dustOpacity,
            background: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255, 205, 17, 0.15) 8px, rgba(255, 205, 17, 0.15) 12px)`,
          }}
          aria-hidden="true"
        />

        {/* Dust particles */}
        <div
          className="absolute bottom-24 z-10 pointer-events-none"
          style={{
            left: `${Math.max(bulldozerX - 15, 0)}%`,
            opacity: dustOpacity,
          }}
          aria-hidden="true"
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/20"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                left: `${Math.random() * 60 - 30}px`,
                bottom: `${Math.random() * 40}px`,
                animation: `float ${1.5 + Math.random() * 2}s ease-out infinite`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Bulldozer */}
        <div
          className="absolute bottom-8 z-20 w-[300px] sm:w-[400px] md:w-[500px] lg:w-[600px]"
          style={{
            left: `${bulldozerX}%`,
            transform: `translateX(-50%) scale(${bulldozerScale})`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <img
            src="/images/bulldozer.jpg"
            alt="Caterpillar bulldozer being inspected by AI"
            className="w-full h-auto drop-shadow-[0_0_40px_rgba(255,205,17,0.3)]"
            crossOrigin="anonymous"
          />
        </div>

        {/* Ground line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-border" aria-hidden="true" />
        <div
          className="absolute bottom-0 left-0 h-px bg-primary/40"
          style={{ width: `${trackWidth}%` }}
          aria-hidden="true"
        />
      </div>

      <style jsx>{`
        @keyframes float {
          0% { opacity: 0.6; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-30px) scale(0.5); }
        }
      `}</style>
    </section>
  )
}
