import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Layers, AlertCircle, TrendingUp } from "lucide-react";

export const ConnectClusters = ({ clusters = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3" data-testid="connect-clusters">
      {clusters.map((cluster, index) => (
        <div
          key={cluster.id}
          className="card-enterprise p-4 group cursor-pointer hover:border-[#F7B500]/50"
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
                <h4 className="font-semibold text-[14px] text-slate-900 dark:text-white truncate group-hover:text-[#F7B500] transition-colors">
                  {cluster.title}
                </h4>
                <span className="text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                  {cluster.count} similar
                </span>
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {cluster.summary}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        </div>
      ))}

      {clusters.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">No similar inspections found</p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">AI will identify patterns across inspections</p>
        </div>
      )}
    </div>
  );
};

export default ConnectClusters;
