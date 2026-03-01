"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, User, FileText, TrendingUp, AlertTriangle } from "lucide-react"

const conversation = [
  {
    role: "user" as const,
    message: "Give me a summary of today's D9 bulldozer fleet inspection.",
  },
  {
    role: "ai" as const,
    message:
      "Fleet inspection complete. 12 units inspected across Site A and B. 2 units flagged: Unit #D9-047 shows hydraulic line wear at 78% — recommend replacement within 200 operating hours. Unit #D9-112 has track tension outside spec. All other units passed 147-point inspection.",
  },
  {
    role: "user" as const,
    message: "Generate the full compliance report for Site A.",
  },
  {
    role: "ai" as const,
    message:
      "Report generated. 38-page OSHA-compliant document covering all 8 units at Site A. Includes: visual defect analysis, component wear measurements, fluid analysis results, and predictive maintenance timeline. PDF ready for download.",
  },
]

export function AIAgentSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [visibleMessages, setVisibleMessages] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.15 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = setInterval(() => {
      setVisibleMessages((prev) => {
        if (prev >= conversation.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 600)
    return () => clearInterval(timer)
  }, [visible])

  return (
    <section
      ref={sectionRef}
      id="agent"
      className="relative py-32 px-6 lg:px-8 bg-background"
      aria-label="AI Agent"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-20 items-center">
          {/* Left: Chat interface */}
          <div
            className={`lg:w-1/2 w-full transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Inspect AI Agent
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-5 space-y-4 min-h-[380px]">
                {conversation.slice(0, visibleMessages).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    } animate-in fade-in slide-in-from-bottom-2 duration-500`}
                  >
                    {msg.role === "ai" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground border border-border"
                      }`}
                    >
                      {msg.message}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary border border-border">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {visibleMessages < conversation.length && visible && (
                  <div className="flex gap-3 items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex gap-1 items-center px-4 py-3 rounded-lg bg-secondary border border-border">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="border-t border-border px-5 py-3">
                <div className="flex items-center gap-3 rounded-lg bg-secondary border border-border px-4 py-2.5">
                  <span className="text-sm text-muted-foreground flex-1">
                    Ask your AI agent anything...
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                    <svg
                      className="h-3.5 w-3.5 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 19V5m0 0l-7 7m7-7l7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Description */}
          <div
            className={`lg:w-1/2 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">
              AI Conversation Agent
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-foreground tracking-tight font-serif text-balance">
              Ask questions.
              <br />
              Get answers. Get reports.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Your AI agent understands every inspection across your fleet.
              Ask it anything — from individual unit status to fleet-wide
              trend analysis. It generates full compliance reports in seconds.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                {
                  icon: FileText,
                  label: "Full Report Generation",
                  desc: "38-page OSHA-compliant reports generated in under 30 seconds",
                },
                {
                  icon: TrendingUp,
                  label: "Trend Analysis",
                  desc: "AI identifies patterns across thousands of inspections",
                },
                {
                  icon: AlertTriangle,
                  label: "Predictive Alerts",
                  desc: "Early warnings before equipment failures happen",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
