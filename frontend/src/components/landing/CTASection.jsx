import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CTASection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    login(name.trim() || "User");
    setDemoOpen(false);
    setName("");
    navigate("/app/dashboard", { replace: true });
  };

  return (
    <>
      <section
        ref={sectionRef}
        className="relative py-32 px-6 lg:px-8 bg-background overflow-hidden"
        aria-label="Call to action"
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#FFCD11 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />

        <div
          className={`mx-auto max-w-3xl text-center relative transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <span className="text-xs font-medium text-primary tracking-wide">
              Now available for enterprise teams
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight font-serif text-balance">
            Ready to transform
            <br />
            your inspections?
          </h2>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Join the construction companies already using Caterpillar Inspect AI
            to cut inspection time by 80% and eliminate missed defects.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-8 h-12 gap-2"
              onClick={() => setDemoOpen(true)}
            >
              Request a Demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-secondary font-semibold text-base px-8 h-12"
            >
              Contact Sales
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Enterprise deployment. SOC 2 compliant. 24/7 support.
          </p>
        </div>
      </section>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Enter your name</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDemoSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="demo-name" className="text-foreground">Name</Label>
              <Input
                id="demo-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Any name..."
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Continue to Dashboard
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
