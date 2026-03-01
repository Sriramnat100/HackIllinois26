"use client"

import { useEffect, useRef, useState } from "react"

const stats = [
  {
    value: "5x",
    label: "Faster Inspections",
    description: "Reduce average inspection time from 45 minutes to under 10",
  },
  {
    value: "99.2%",
    label: "Accuracy Rate",
    description: "AI-powered defect detection surpasses manual inspection accuracy",
  },
  {
    value: "67%",
    label: "Cost Reduction",
    description: "Lower operational costs through predictive maintenance and automation",
  },
  {
    value: "< 30s",
    label: "Report Generation",
    description: "Full compliance reports generated automatically after each inspection",
  },
]

function AnimatedCounter({
  value,
  visible,
}: {
  value: string
  visible: boolean
}) {
  const [display, setDisplay] = useState(value.replace(/[\d.]/g, "0"))

  useEffect(() => {
    if (!visible) return

    let frame = 0
    const totalFrames = 30
    const interval = setInterval(() => {
      frame++
      if (frame >= totalFrames) {
        setDisplay(value)
        clearInterval(interval)
        return
      }
      const progress = frame / totalFrames
      const result = value.replace(/\d+\.?\d*/g, (match) => {
        const num = parseFloat(match)
        const current = num * progress
        if (match.includes(".")) {
          return current.toFixed(match.split(".")[1].length)
        }
        return Math.round(current).toString()
      })
      setDisplay(result)
    }, 30)

    return () => clearInterval(interval)
  }, [visible, value])

  return <>{display}</>
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="stats"
      className="relative py-32 px-6 lg:px-8 bg-card"
      aria-label="Results and statistics"
    >
      {/* Yellow accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/20" aria-hidden="true" />

      <div className="mx-auto max-w-7xl">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">
            Proven Results
          </span>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold text-foreground tracking-tight font-serif text-balance">
            The numbers speak for themselves.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`relative group rounded-xl border border-border bg-background p-8 text-center hover:border-primary/40 transition-all duration-700 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="absolute inset-0 rounded-xl bg-primary/[0.02] group-hover:bg-primary/[0.05] transition-colors" aria-hidden="true" />
              <p className="text-4xl md:text-5xl font-bold text-primary font-serif relative">
                <AnimatedCounter value={stat.value} visible={visible} />
              </p>
              <p className="mt-3 text-sm font-semibold text-foreground relative">
                {stat.label}
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed relative">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
