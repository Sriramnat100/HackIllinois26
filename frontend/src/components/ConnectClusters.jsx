import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Layers,
  Truck,
  FileText,
  Wrench,
  Package,
  Calendar,
  MapPin,
  Building2,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Check if item is the new detailed "similar vehicle" format */
function isDetailedSimilar(item) {
  return item && (item.executive_summary != null || (Array.isArray(item.how_they_fixed_it) && item.how_they_fixed_it.length > 0));
}

export const ConnectClusters = ({ clusters = [] }) => {
  const navigate = useNavigate();
  const detailed = clusters.filter(isDetailedSimilar);
  const legacy = clusters.filter((c) => !isDetailedSimilar(c));

  return (
    <div className="space-y-6" data-testid="connect-clusters">
      {/* Detailed similar vehicles: executive summary + how they fixed it */}
      {detailed.length > 0 && (
        <div className="space-y-1 mb-2">
          <h3 className="text-[13px] font-semibold text-slate-500 dark:text-white/80 uppercase tracking-wide">
            Vehicles with similar issues
          </h3>
          <p className="text-[12px] text-slate-500 dark:text-white/70">
            Executive summaries and resolution steps from other inspections to help you fix this unit.
          </p>
        </div>
      )}

      {detailed.map((item) => (
        <div
          key={cluster.id}
          className="card-enterprise p-4 group cursor-pointer"
          onClick={() => navigate(`/app/inspections/${cluster.id}`)}
          data-testid={`cluster-${cluster.id}`}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              {index === 0 ? (
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-[14px] text-slate-900 dark:text-white truncate group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  {cluster.title}
          key={item.id}
          className={cn(
            "card-enterprise overflow-hidden",
            "border border-slate-200 dark:border-slate-700",
            "hover:border-[#F7B500]/40 transition-colors"
          )}
          data-testid={`similar-vehicle-${item.id}`}
        >
          {/* Vehicle header */}
          <div className="card-header-enterprise border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F7B500]/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-[#F7B500]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[15px] text-slate-900 dark:text-white">
                  {item.equipment_model}
                </h4>
                {item.serial_number && (
                  <p className="text-[12px] font-mono text-slate-500 dark:text-white/80 mt-0.5">
                    {item.serial_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Issue */}
            {(item.issue_title || item.issue_description) && (
              <div>
                <h5 className="text-[12px] font-semibold text-slate-700 dark:text-white/90 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Issue
                </h5>
                {item.issue_title && (
                  <p className="font-semibold text-[14px] text-slate-900 dark:text-white mb-1.5">
                    {item.issue_title}
                  </p>
                )}
                {item.issue_description && (
                  <p className="text-[13px] text-slate-600 dark:text-white/90 leading-relaxed">
                    {item.issue_description}
                  </p>
                )}
              </div>
            )}

            {/* Executive summary */}
            {item.executive_summary && (
              <div>
                <h5 className="text-[12px] font-semibold text-slate-700 dark:text-white/90 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Executive summary
                </h5>
                <p className="text-[13px] text-slate-700 dark:text-white/95 leading-relaxed whitespace-pre-line">
                  {item.executive_summary}
                </p>
              </div>
            )}

            {/* How they fixed it */}
            {Array.isArray(item.how_they_fixed_it) && item.how_they_fixed_it.length > 0 && (
              <div>
                <h5 className="text-[12px] font-semibold text-slate-700 dark:text-white/90 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-500" />
                  How they fixed it
                </h5>
                <ol className="space-y-2">
                  {item.how_they_fixed_it.map((step, i) => (
                    <li key={i} className="flex gap-3 text-[13px] text-slate-700 dark:text-white/90 leading-relaxed">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-white/90">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Parts used */}
            {Array.isArray(item.parts_used) && item.parts_used.length > 0 && (
              <div>
                <h5 className="text-[12px] font-semibold text-slate-700 dark:text-white/90 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-violet-500" />
                  Parts used
                </h5>
                <ul className="flex flex-wrap gap-2">
                  {item.parts_used.map((part, i) => (
                    <li
                      key={i}
                      className="text-[12px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white/90 font-mono"
                    >
                      {part}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resolution notes */}
            {item.resolution_notes && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[12px] text-slate-600 dark:text-white/80 italic flex items-start gap-2">
                  <ClipboardList className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
                  {item.resolution_notes}
                </p>
              </div>
            )}

            {/* View inspection */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[13px] border-slate-200 dark:border-slate-700"
                onClick={() => navigate(`/app/inspections/${item.id}`)}
                data-testid={`view-inspection-${item.id}`}
              >
                View full inspection
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Legacy cluster cards (title + summary + count) */}
      {legacy.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-[13px] font-semibold text-slate-500 dark:text-white/80 uppercase tracking-wide">
            Related clusters
          </h3>
          {legacy.map((cluster) => (
            <div
              key={cluster.id}
              className="card-enterprise p-4 group cursor-pointer hover:border-[#F7B500]/50"
              onClick={() => navigate(`/app/inspections/${cluster.id}`)}
              data-testid={`cluster-${cluster.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-[14px] text-slate-900 dark:text-white truncate group-hover:text-[#F7B500] transition-colors">
                      {cluster.title}
                    </h4>
                    {cluster.count != null && (
                      <span className="text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                        {cluster.count} similar
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-600 dark:text-white line-clamp-2 leading-relaxed">
                    {cluster.summary}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {clusters.length === 0 && (
        <div className="text-center py-16">
          <div className="icon-glass icon-glass-2xl rounded-full mx-auto mb-4">
            <Layers className="w-7 h-7 text-slate-300 dark:text-white/70" />
          </div>
          <p className="text-[14px] font-medium text-slate-500 dark:text-white">
            No similar inspections found
          </p>
          <p className="text-[12px] text-slate-400 dark:text-white/90 mt-1">
            Similar vehicles with matching issues and their fix details will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectClusters;
