import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AlertTriangle, TrendingUp, Wrench, FileCheck, Lightbulb, X, Maximize2 } from "lucide-react";
import { SeverityHeatMap } from "@/components/SeverityHeatMap";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COLORS = ["#059669", "#DC2626", "#D97706"];
const SEVERITY_COLORS = { HIGH: "#DC2626", MEDIUM: "#D97706", LOW: "#059669" };

export function CategoryAnalyticsDetail({ category, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(null);

  useEffect(() => {
    if (!open || !category) return;
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/analytics/category/${encodeURIComponent(category)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load category analytics");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, open]);

  if (!category) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        <SheetHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <span className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </span>
            {category} – Detailed Analytics
          </SheetTitle>
          <SheetDescription className="text-slate-500 dark:text-slate-400">
            Inspection analytics and insights for this category (last 90 days)
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
              Loading analytics…
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              {error}
            </div>
          )}
          {data && !loading && (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total failures</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{data.total_failures}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">% of all failures</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{data.percentage_of_all}%</p>
                </div>
              </div>

              {/* Failures over time */}
              {data.failures_over_time?.length > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFullscreen({ key: "failures_over_time", title: "Failures over time" })}
                  onKeyDown={(e) => e.key === "Enter" && setFullscreen({ key: "failures_over_time", title: "Failures over time" })}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 cursor-pointer hover:ring-2 hover:ring-amber-500/30 transition-shadow relative group"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Failures over time
                  </h4>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.failures_over_time} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="count" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} name="Failures" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Item breakdown (Pass / Fail / Monitor per item) */}
              {data.item_breakdown?.length > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFullscreen({ key: "item_breakdown", title: "Checklist items in this category" })}
                  onKeyDown={(e) => e.key === "Enter" && setFullscreen({ key: "item_breakdown", title: "Checklist items in this category" })}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 cursor-pointer hover:ring-2 hover:ring-amber-500/30 transition-shadow relative group"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-violet-500" />
                    Checklist items in this category
                  </h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.item_breakdown}
                        layout="vertical"
                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="item" width={110} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="pass" stackId="a" fill={COLORS[0]} name="Pass" radius={0} />
                        <Bar dataKey="fail" stackId="a" fill={COLORS[1]} name="Fail" radius={0} />
                        <Bar dataKey="monitor" stackId="a" fill={COLORS[2]} name="Monitor" radius={[0, 4, 4, 0]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Severity breakdown */}
              {data.severity_breakdown?.length > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFullscreen({ key: "severity", title: "Severity distribution" })}
                  onKeyDown={(e) => e.key === "Enter" && setFullscreen({ key: "severity", title: "Severity distribution" })}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 cursor-pointer hover:ring-2 hover:ring-amber-500/30 transition-shadow relative group"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Severity distribution</h4>
                  <div className="h-28 flex items-center gap-4">
                    <ResponsiveContainer width="40%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.severity_breakdown}
                          dataKey="count"
                          nameKey="severity"
                          cx="50%"
                          cy="50%"
                          innerRadius={24}
                          outerRadius={36}
                          paddingAngle={2}
                          label={({ severity, count }) => `${severity}: ${count}`}
                        >
                          {data.severity_breakdown.map((_, i) => (
                            <Cell key={i} fill={SEVERITY_COLORS[data.severity_breakdown[i].severity] || "#64748B"} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1">
                      {data.severity_breakdown.map((s) => (
                        <div key={s.severity} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: SEVERITY_COLORS[s.severity] || "#64748B" }}
                            />
                            {s.severity}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Severity heat map by region (global + zoom to local) */}
              {data.heatmap_global?.length > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFullscreen({ key: "heatmap", title: "Severity by region" })}
                  onKeyDown={(e) => e.key === "Enter" && setFullscreen({ key: "heatmap", title: "Severity by region" })}
                  className="cursor-pointer hover:ring-2 hover:ring-amber-500/30 transition-shadow rounded-lg overflow-hidden relative group"
                >
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-slate-400 bg-white/90 rounded p-0.5" />
                  </div>
                  <SeverityHeatMap
                    heatmapGlobal={data.heatmap_global}
                    heatmapLocal={data.heatmap_local || {}}
                    categoryName={category}
                    compact
                  />
                </div>
              )}

              {/* Top recommended actions */}
              {data.top_recommended_actions?.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-500" />
                    Top recommended actions
                  </h4>
                  <ul className="space-y-2">
                    {data.top_recommended_actions.map((a, i) => (
                      <li key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{a.action}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{a.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recent inspections with issues */}
              {data.recent_inspections?.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Recent inspections with issues</h4>
                  <ul className="space-y-2">
                    {data.recent_inspections.map((insp) => (
                      <li key={insp.id} className="text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                        <p className="font-medium text-slate-900 dark:text-white">{insp.equipment} · {insp.date}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{insp.summary}</p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            insp.result === "FAIL"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {insp.result}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Insight summary */}
              {data.insight_summary && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Insight
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{data.insight_summary}</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>

      {/* Fullscreen overlay for chart/map */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Enlarged: ${fullscreen.title}`}
        >
          <div className="absolute top-0 right-0 p-4 z-10">
            <button
              type="button"
              onClick={() => setFullscreen(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 pt-16 overflow-auto">
            <h3 className="text-lg font-semibold text-white mb-4">{fullscreen.title}</h3>
            <div className="w-full max-w-4xl h-[70vh] min-h-[300px] bg-white dark:bg-slate-800 rounded-lg p-4 overflow-auto">
              {fullscreen.key === "failures_over_time" && data?.failures_over_time?.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.failures_over_time} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} name="Failures" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {fullscreen.key === "item_breakdown" && data?.item_breakdown?.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.item_breakdown} layout="vertical" margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="item" width={140} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Bar dataKey="pass" stackId="a" fill={COLORS[0]} name="Pass" />
                    <Bar dataKey="fail" stackId="a" fill={COLORS[1]} name="Fail" />
                    <Bar dataKey="monitor" stackId="a" fill={COLORS[2]} name="Monitor" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {fullscreen.key === "severity" && data?.severity_breakdown?.length > 0 && (
                <div className="flex items-center justify-center h-full gap-8">
                  <ResponsiveContainer width="50%" height="80%">
                    <PieChart>
                      <Pie
                        data={data.severity_breakdown}
                        dataKey="count"
                        nameKey="severity"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ severity, count }) => `${severity}: ${count}`}
                      >
                        {data.severity_breakdown.map((_, i) => (
                          <Cell key={i} fill={SEVERITY_COLORS[data.severity_breakdown[i].severity] || "#64748B"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {data.severity_breakdown.map((s) => (
                      <div key={s.severity} className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[s.severity] || "#64748B" }} />
                        <span>{s.severity}: {s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fullscreen.key === "heatmap" && data?.heatmap_global?.length > 0 && (
                <SeverityHeatMap
                  heatmapGlobal={data.heatmap_global}
                  heatmapLocal={data.heatmap_local || {}}
                  categoryName={category}
                  compact={false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default CategoryAnalyticsDetail;
