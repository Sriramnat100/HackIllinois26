import { useEffect, useRef, useState } from "react";
import { Eye, Cpu, Zap, Shield } from "lucide-react";

const FEATURES_IMG = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80";

const features = [
  {
    icon: Eye,
    title: "AI Smart Glasses",
    description:
      "Wearable AR glasses with real-time AI overlay. The AI sees what you see — identifying defects, measuring wear, and flagging issues as you walk the site.",
  },
  {
    icon: Cpu,
    title: "Automated Reports",
    description:
      "Full inspection reports generated automatically from your walkthrough. No more clipboards, no more typing. Just inspect and go.",
  },
  {
    icon: Zap,
    title: "Real-Time Processing",
    description:
      "Edge-computed AI processes visual data in milliseconds. Get instant alerts on critical issues without waiting for cloud processing.",
  },
  {
    icon: Shield,
    title: "Compliance Built-In",
    description:
      "Every inspection automatically mapped to regulatory standards. OSHA, DOT, and industry-specific compliance checks run in the background.",
  },
];

export function FeaturesSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-32 px-6 lg:px-8 bg-background"
      aria-label="Features"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-20">
          <div
            className={`lg:w-1/2 transition-all duration-1000 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img
                src={FEATURES_IMG}
                alt="Inspector wearing AI-powered smart glasses while examining heavy equipment"
                className="w-full h-auto object-cover aspect-[4/3]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-3 rounded-md bg-secondary/80 backdrop-blur-sm border border-border px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">
                    AI Vision Active — 47 checkpoints scanned
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 flex flex-col gap-4">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">
              Core Capabilities
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight font-serif text-balance">
              Your AI co-inspector.
              <br />
              Always watching. Always learning.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Catvision combines wearable technology with enterprise-grade machine learning to transform how your team conducts inspections.
            </p>

            <div className="grid gap-4">
              {features.map((feature, i) => (
                <div
                  key={feature.title}
                  className={`group flex gap-4 rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:bg-secondary/50 transition-all duration-500 ${
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
