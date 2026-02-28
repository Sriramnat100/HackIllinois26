import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Award, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export const PartsMatchList = ({ parts = [] }) => {
  return (
    <div className="space-y-3" data-testid="parts-match-list">
      {parts.map((part, index) => (
        <div
          key={part.id}
          className={cn(
            "parts-match-card",
            index === 0 && "parts-match-best"
          )}
          data-testid={`part-${part.id}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Rank/Best Match Indicator */}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                index === 0 
                  ? "bg-[#F7B500]/10" 
                  : "bg-slate-100 dark:bg-slate-800"
              )}>
                {index === 0 ? (
                  <Award className="w-5 h-5 text-[#F7B500]" />
                ) : (
                  <Package className="w-5 h-5 text-slate-400" />
                )}
              </div>
              
              <div className="flex-1">
                {/* Best Match Badge */}
                {index === 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 bg-[#F7B500]/10 text-[#F7B500] text-[10px] font-bold uppercase tracking-wider rounded">
                    <Check className="w-3 h-3" />
                    Best Match
                  </span>
                )}
                
                {/* Part Info */}
                <div className="mb-2">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    #{part.part_number}
                  </span>
                  <h4 className="font-semibold text-[15px] text-slate-900 dark:text-white mt-0.5">
                    {part.part_name}
                  </h4>
                </div>
                
                {/* Fitment Certainty */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Fitment Certainty
                    </span>
                    <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.round(part.fitment_certainty * 100)}%
                    </span>
                  </div>
                  <div className="fitment-bar">
                    <div 
                      className="fitment-bar-fill" 
                      style={{ width: `${Math.round(part.fitment_certainty * 100)}%` }}
                    />
                  </div>
                </div>
                
                {/* Compatible Models */}
                <div className="flex flex-wrap gap-1.5">
                  {part.compatible_models.map((model) => (
                    <span
                      key={model}
                      className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-medium"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Add to Order Button */}
            <Button
              className={cn(
                "flex-shrink-0",
                index === 0 
                  ? "btn-primary-cat" 
                  : "btn-secondary-cat"
              )}
              data-testid={`add-part-${part.id}`}
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              Add to Order
            </Button>
          </div>
        </div>
      ))}

      {parts.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">No parts matches found</p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">AI will identify parts during live inspection</p>
        </div>
      )}
    </div>
  );
};

export default PartsMatchList;
