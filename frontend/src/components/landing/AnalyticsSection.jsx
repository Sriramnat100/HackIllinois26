import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";

const inspectionData = [
  { month: "Jan", inspections: 120, issues: 18 },
  { month: "Feb", inspections: 145, issues: 12 },
  { month: "Mar", inspections: 168, issues: 9 },
  { month: "Apr", inspections: 192, issues: 7 },
  { month: "May", inspections: 215, issues: 5 },
  { month: "Jun", inspections: 248, issues: 4 },
];

const efficiencyData = [
  { week: "W1", before: 45, after: 88 },
  { week: "W2", before: 42, after: 91 },
  { week: "W3", before: 48, after: 89 },
  { week: "W4", before: 44, after: 94 },
  { week: "W5", before: 41, after: 92 },
  { week: "W6", before: 46, after: 96 },
];

export function AnalyticsSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="analytics"
      className="relative py-32 px-6 lg:px-8 bg-card"
      aria-label="Analytics dashboard"
    >
      <div className="mx-auto max-w-7xl">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">
            Analytics Platform
          </span>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold text-foreground tracking-tight font-serif text-balance">
            Every inspection. Every detail.
            <br />
            <span className="text-muted-foreground">All in one dashboard.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            AI-powered analytics turn raw inspection data into actionable insights. Track trends, predict failures, and optimize maintenance schedules.
          </p>
        </div>

        <div
          className={`relative rounded-xl border border-border bg-background overflow-hidden transition-all duration-1000 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">
                Catvision Dashboard
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Last updated: 2 min ago</span>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Inspections", value: "1,248", change: "+23%" },
                { label: "Issues Detected", value: "56", change: "-41%" },
                { label: "Avg. Time / Inspection", value: "12m", change: "-67%" },
                { label: "Compliance Rate", value: "99.2%", change: "+8%" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground font-serif">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-green-400">
                    {stat.change} vs last quarter
                  </p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Inspections vs Issues Found
                </h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inspectionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "#a3a3a3", fontSize: 12 }}
                        axisLine={{ stroke: "#262626" }}
                      />
                      <YAxis
                        tick={{ fill: "#a3a3a3", fontSize: 12 }}
                        axisLine={{ stroke: "#262626" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #262626",
                          borderRadius: "8px",
                          color: "#f5f5f5",
                        }}
                      />
                      <Bar dataKey="inspections" fill="#FFCD11" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="issues" fill="#FFCD11" opacity={0.3} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Efficiency Score: Before vs After AI
                </h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={efficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: "#a3a3a3", fontSize: 12 }}
                        axisLine={{ stroke: "#262626" }}
                      />
                      <YAxis
                        tick={{ fill: "#a3a3a3", fontSize: 12 }}
                        axisLine={{ stroke: "#262626" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #262626",
                          borderRadius: "8px",
                          color: "#f5f5f5",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="before"
                        stroke="#a3a3a3"
                        fill="#a3a3a3"
                        fillOpacity={0.1}
                      />
                      <Area
                        type="monotone"
                        dataKey="after"
                        stroke="#FFCD11"
                        fill="#FFCD11"
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
