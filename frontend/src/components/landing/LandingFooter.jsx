export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M16 2L30 28H2L16 2Z" fill="#FFCD11" />
              <path d="M16 8L24 24H8L16 8Z" fill="#000000" />
              <path d="M16 14L20 22H12L16 14Z" fill="#FFCD11" />
            </svg>
            <span className="text-sm font-bold text-foreground tracking-tight font-serif">
              CATERPILLAR
            </span>
          </div>

          <nav className="flex items-center gap-6" aria-label="Footer navigation">
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

          <p className="text-xs text-muted-foreground">
            Caterpillar Inspect AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
