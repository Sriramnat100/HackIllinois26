"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <CatTriangleLogo />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-foreground font-serif">
                CATERPILLAR
              </span>
              <span className="text-xs font-medium tracking-widest text-primary">
                INSPECT AI
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Analytics
            </a>
            <a href="#agent" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              AI Agent
            </a>
            <a href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Results
            </a>
          </nav>

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm px-6">
            Log In
          </Button>
        </div>
      </div>
    </nav>
  )
}

function CatTriangleLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 2L30 28H2L16 2Z"
        fill="#FFCD11"
        stroke="#FFCD11"
        strokeWidth="1"
      />
      <path
        d="M16 8L24 24H8L16 8Z"
        fill="#000000"
      />
      <path
        d="M16 14L20 22H12L16 14Z"
        fill="#FFCD11"
      />
    </svg>
  )
}
