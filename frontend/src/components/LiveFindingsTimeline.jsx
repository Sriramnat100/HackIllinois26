import { ScrollArea } from "@/components/ui/scroll-area";
import { SeverityBadge } from "./StatusBadge";
import { AlertTriangle, Clock, Pin, Lightbulb, Percent, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const severityStrip = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-cyan-400",
};

export const LiveFindingsTimeline = ({ findings = [], isRecording }) => {
  // Sort findings by severity (HIGH first) and pin safety alerts at top
  const sortedFindings = [...findings].sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const safetyAlerts = sortedFindings.filter((f) => f.severity === "HIGH");
  const otherFindings = sortedFindings.filter((f) => f.severity !== "HIGH");

  return (
    <div 
      className="h-full flex flex-col bg-[#0d1118]"
      data-testid="live-findings-timeline"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-[#101722]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-300" />
            <h3 className="text-[14px] font-semibold text-white tracking-tight">
            <Activity className="w-4 h-4 text-slate-500 dark:text-white" />
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">
              Live Findings
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Streaming
              </span>
            )}
            <span className="text-[12px] text-slate-400 font-medium">
            <span className="text-[12px] text-slate-500 dark:text-white font-medium">
              {findings.length} found
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Safety Alerts Section */}
          {safetyAlerts.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Pin className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">
                  Safety Alerts
                </span>
                <span className="ml-auto text-[11px] text-red-200 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded font-medium">
                  {safetyAlerts.length}
                </span>
              </div>
              <div className="space-y-2">
                {safetyAlerts.map((finding, index) => (
                  <FindingItem key={finding.id || index} finding={finding} isSafetyAlert />
                ))}
              </div>
            </div>
          )}

          {/* Other Findings */}
          {otherFindings.length > 0 && (
            <div className="space-y-2">
              {safetyAlerts.length > 0 && (
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">
                <div className="text-[11px] font-medium text-slate-500 dark:text-white uppercase tracking-wider mb-2 px-1">
                  Other Findings
                </div>
              )}
              {otherFindings.map((finding, index) => (
                <FindingItem key={finding.id || index} finding={finding} />
              ))}
            </div>
          )}

          {findings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 border border-slate-700">
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/90">
              <div className="icon-glass w-12 h-12 rounded-full mb-3">
                <AlertTriangle className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-[13px] font-medium">No findings yet</p>
              <p className="text-[12px] opacity-70 mt-1">Start recording to detect issues</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const FindingItem = ({ finding, isSafetyAlert }) => {
  const severity = finding.severity || "LOW";
  return (
    <div
      className={cn(
        "relative finding-item overflow-hidden pl-4",
        isSafetyAlert ? "finding-item-high" : 
        severity === "MEDIUM" ? "finding-item-medium" : "finding-item-low"
      )}
      data-testid={`finding-${finding.id}`}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          severityStrip[severity] || severityStrip.LOW
        )}
      />
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isSafetyAlert && (
            <div className="w-6 h-6 rounded bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
            </div>
          )}
          <span className="font-semibold text-[13px] text-slate-100 leading-tight">
            {finding.title}
          </span>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-2.5">
      <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-white mb-2.5">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {finding.timestamp}
        </span>
        <span className="flex items-center gap-1">
          <Percent className="w-3 h-3" />
          {Math.round(finding.confidence * 100)}%
        </span>
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2 text-[12px] text-slate-300 bg-slate-900/60 border border-slate-700 rounded-md p-2.5">
      <div className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-white bg-white/60 dark:bg-slate-800/50 rounded-lg p-2.5">
        <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-[#F7B500] flex-shrink-0" />
        <span className="leading-relaxed">{finding.recommendation}</span>
      </div>
    </div>
  );
};

export default LiveFindingsTimeline;
