import { cn } from "@/lib/utils";

const statusConfig = {
  PASS: {
    className: "badge-pass",
    dot: "bg-emerald-500",
  },
  FAIL: {
    className: "badge-fail",
    dot: "bg-red-500",
  },
  MONITOR: {
    className: "badge-monitor",
    dot: "bg-amber-500",
  },
  Draft: {
    className: "badge-draft",
    dot: "bg-slate-400",
  },
  "In Progress": {
    className: "badge-progress",
    dot: "bg-blue-500",
  },
  Submitted: {
    className: "badge-submitted",
    dot: "bg-violet-500",
  },
};

export const StatusBadge = ({ status, className, showDot = false }) => {
  const config = statusConfig[status] || statusConfig.Draft;

  return (
    <span
      className={cn(
        "badge-status",
        config.className,
        className
      )}
      data-testid={`status-badge-${status?.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.dot)} />
      )}
      {status}
    </span>
  );
};

const severityConfig = {
  HIGH: {
    className: "badge-severity-high",
    dot: "bg-red-500",
    icon: "text-red-500",
  },
  MEDIUM: {
    className: "badge-severity-medium",
    dot: "bg-amber-500",
    icon: "text-amber-500",
  },
  LOW: {
    className: "badge-severity-low",
    dot: "bg-emerald-500",
    icon: "text-emerald-500",
  },
};

export const SeverityBadge = ({ severity, className }) => {
  const config = severityConfig[severity] || severityConfig.LOW;

  return (
    <span
      className={cn(
        "badge-severity",
        config.className,
        className
      )}
      data-testid={`severity-badge-${severity?.toLowerCase()}`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {severity}
    </span>
  );
};

export default StatusBadge;
