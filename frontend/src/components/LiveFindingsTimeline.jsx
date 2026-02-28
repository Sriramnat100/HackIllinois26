import { ScrollArea } from "@/components/ui/scroll-area";
import { SeverityBadge } from "./StatusBadge";
import { AlertTriangle, Clock, Pin, Lightbulb, Percent, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className="h-full flex flex-col bg-white dark:bg-slate-900"
      data-testid="live-findings-timeline"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">
              Live Findings
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Streaming
              </span>
            )}
            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
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
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  Safety Alerts
                </span>
                <span className="ml-auto text-[11px] text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded font-medium">
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
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Other Findings
                </div>
              )}
              {otherFindings.map((finding, index) => (
                <FindingItem key={finding.id || index} finding={finding} />
              ))}
            </div>
          )}

          {findings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
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
  return (
    <div
      className={cn(
        "finding-item",
        isSafetyAlert ? "finding-item-high" : 
        finding.severity === "MEDIUM" ? "finding-item-medium" : "finding-item-low"
      )}
      data-testid={`finding-${finding.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isSafetyAlert && (
            <div className="w-6 h-6 rounded bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </div>
          )}
          <span className="font-semibold text-[13px] text-slate-900 dark:text-white leading-tight">
            {finding.title}
          </span>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {finding.timestamp}
        </span>
        <span className="flex items-center gap-1">
          <Percent className="w-3 h-3" />
          {Math.round(finding.confidence * 100)}% confidence
        </span>
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-800/50 rounded-lg p-2.5">
        <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-[#F7B500] flex-shrink-0" />
        <span className="leading-relaxed">{finding.recommendation}</span>
      </div>
    </div>
  );
};

export default LiveFindingsTimeline;
