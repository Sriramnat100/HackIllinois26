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
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-foreground tracking-tight font-serif">
                CATERPILLAR
              </span>
              <span className="text-xs font-medium tracking-widest text-primary">
                VISION AI
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Catvision. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
