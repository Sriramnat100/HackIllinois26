import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, SeverityBadge } from "@/components/StatusBadge";
import { MediaGallery } from "@/components/MediaGallery";
import { PartsMatchList } from "@/components/PartsMatchList";
import { ConnectClusters } from "@/components/ConnectClusters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  RefreshCw,
  Share2,
  AlertTriangle,
  Image,
  Wrench,
  Link2,
  CheckCircle,
  Edit2,
  Truck,
  Calendar,
  MapPin,
  ListChecks,
} from "lucide-react";
import { GoogleDocsIcon } from "@/components/icons/GoogleDocsIcon";
import axios from "axios";
import { toast } from "sonner";
import { API_URL } from "@/config";

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "summary");
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchInspection();
  }, [id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const fetchInspection = async () => {
    try {
      const response = await axios.get(`${API_URL}/inspections/${id}`);
      setInspection(response.data);
    } catch (error) {
      console.error("Error fetching inspection:", error);
      toast.error("Failed to load inspection");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    toast.info("Regenerating report...");
    setTimeout(() => {
      toast.success("Report regenerated successfully");
    }, 2000);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Link copied to clipboard");
      } catch (e) {
        toast.error("Unable to copy link");
      }
      document.body.removeChild(textArea);
    }
  };

  const handleChecklistUpdate = async (itemId, newResult) => {
    try {
      await axios.put(`${API_URL}/inspections/${id}/checklist/${itemId}`, null, {
        params: { result: newResult },
      });
      
      setInspection((prev) => ({
        ...prev,
        checklist: prev.checklist.map((item) =>
          item.id === itemId ? { ...item, result: newResult } : item
        ),
      }));
      
      setEditingItem(null);
      toast.success("Checklist item updated");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update item");
    }
  };

  // Result counts (PASS / FAIL / MONITOR) for chart
  const resultChartData = useMemo(() => {
    const checklist = inspection?.checklist || [];
    const counts = { PASS: 0, FAIL: 0, MONITOR: 0 };
    checklist.forEach((item) => {
      const r = (item.result || "").toUpperCase();
      if (counts[r] !== undefined) counts[r]++;
    });
    const colors = { PASS: "#059669", FAIL: "#DC2626", MONITOR: "#D97706" };
    return ["PASS", "FAIL", "MONITOR"].map((name) => ({
      name,
      count: counts[name] || 0,
      fill: colors[name],
    }));
  }, [inspection?.checklist]);

  // Items that need fixing (FAIL or MONITOR), sorted by severity (HIGH > MEDIUM > LOW)
  const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const itemsToFix = useMemo(() => {
    const checklist = inspection?.checklist || [];
    return checklist
      .filter((item) => {
        const r = (item.result || "").toUpperCase();
        return r === "FAIL" || r === "MONITOR";
      })
      .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
  }, [inspection?.checklist]);

  function getQuickFixSteps(item) {
    const action = item.recommended_action?.trim();
    if (action) {
      return [
        `1. ${action}`,
        "2. Verify repair (re-test or re-inspect as applicable)",
        "3. Document and close finding in next inspection",
      ];
    }
    const category = (item.category || "").toLowerCase();
    if (category.includes("hydraulic")) {
      return [
        "1. Depressurize the hydraulic system and locate the source",
        "2. Replace or repair the affected component (line, seal, or fitting)",
        "3. Refill fluid to spec, bleed air, and test operation",
      ];
    }
    if (category.includes("engine") || category.includes("oil") || category.includes("coolant")) {
      return [
        "1. Check levels and condition; top off or replace fluid if needed",
        "2. Inspect for leaks and repair if found",
        "3. Run engine and re-check levels after warm-up",
      ];
    }
    if (category.includes("safety") || category.includes("mirror") || category.includes("camera")) {
      return [
        "1. Order correct replacement part (see Parts tab for matches)",
        "2. Replace component and align per manual",
        "3. Verify function and document for compliance",
      ];
    }
    if (category.includes("structural") || category.includes("undercarriage")) {
      return [
        "1. Clean and inspect area; note extent of wear or damage",
        "2. Schedule repair or replacement per maintenance plan",
        "3. Re-inspect after repair and monitor on next walkaround",
      ];
    }
    return [
      "1. Inspect the item and document the finding",
      "2. Repair or replace as needed per procedure",
      "3. Re-check and close out on next inspection",
    ];
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="spinner-cat" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <p className="text-slate-500 dark:text-white/90 mb-4 text-[14px]">Inspection not found</p>
          <Button onClick={() => navigate("/app/dashboard")} className="btn-primary-cat">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 page-enter" data-testid="inspection-detail-page">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-white -ml-2"
              onClick={() => navigate("/app/dashboard")}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="icon-glass icon-glass-xl icon-glass-amber">
                  <Truck className="w-5 h-5 text-[#F7B500]" />
                </div>
                <div>
                  <h1 className="text-[20px] font-bold text-slate-900 dark:text-white">
                    {inspection.equipment_model}
                  </h1>
                  <p className="text-[13px] text-slate-500 dark:text-white/90 font-mono">
                    {inspection.serial_number}
                  </p>
                </div>
                <StatusBadge status={inspection.status} />
              </div>
              <div className="flex items-center gap-4 text-[12px] text-slate-500 dark:text-white/90">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {inspection.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {inspection.location}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-white">
                  {inspection.inspection_type}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-[13px] border-slate-200 dark:border-slate-700"
              onClick={handleRegenerate}
              data-testid="regenerate-btn"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-[13px] border-slate-200 dark:border-slate-700"
              onClick={handleShare}
              data-testid="share-btn"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 h-auto rounded-xl">
            <TabsTrigger 
              value="summary" 
              className="tab-enterprise flex items-center gap-1.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-lg" 
              data-testid="tab-summary"
            >
              <GoogleDocsIcon className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger 
              value="checklist" 
              className="tab-enterprise flex items-center gap-1.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-lg" 
              data-testid="tab-checklist"
            >
              <CheckCircle className="w-4 h-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger 
              value="media" 
              className="tab-enterprise flex items-center gap-1.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-lg" 
              data-testid="tab-media"
            >
              <Image className="w-4 h-4" />
              Media
            </TabsTrigger>
            <TabsTrigger 
              value="parts" 
              className="tab-enterprise flex items-center gap-1.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-lg" 
              data-testid="tab-parts"
            >
              <Wrench className="w-4 h-4" />
              Parts
            </TabsTrigger>
            <TabsTrigger 
              value="connect" 
              className="tab-enterprise flex items-center gap-1.5 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 rounded-lg" 
              data-testid="tab-connect"
            >
              <Link2 className="w-4 h-4" />
              Connect
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-5">
            {/* Executive Summary */}
            <div className="card-enterprise">
              <div className="card-header-enterprise">
                <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">Executive Summary</h3>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-[14px] text-slate-700 dark:text-white leading-relaxed">{inspection.summary}</p>

                {/* Results overview: PASS / FAIL / MONITOR counts */}
                {(inspection.checklist?.length > 0) && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-[#F7B500]" />
                      Results overview
                    </h4>
                    <div className="h-40 w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={resultChartData}
                          layout="vertical"
                          margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                        >
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 12, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--background)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                            formatter={(value) => [`${value} item(s)`, ""]}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                            {resultChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-2 text-[12px]">
                      {resultChartData.map((d) => (
                        <span key={d.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-slate-600 dark:text-white/90">{d.name}:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{d.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items to fix: most severe to least, with quick fix steps */}
                {itemsToFix.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Items to fix (by severity)
                    </h4>
                    <div className="space-y-4">
                      {itemsToFix.map((item, idx) => {
                        const steps = getQuickFixSteps(item);
                        return (
                          <div
                            key={item.id || idx}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <span className="text-[12px] text-slate-500 dark:text-white/80 font-medium">{item.category}</span>
                                <p className="text-[14px] font-semibold text-slate-900 dark:text-white mt-0.5">{item.item}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusBadge status={item.result} />
                                <SeverityBadge severity={item.severity} />
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/80 mb-1.5">Quick fix steps</p>
                              <ol className="space-y-1 text-[13px] text-slate-700 dark:text-white/90 list-decimal list-inside">
                                {steps.map((step, i) => (
                                  <li key={i}>{step.replace(/^\d+\.\s*/, "")}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Safety Critical Findings */}
            {inspection.safety_findings?.length > 0 && (
              <div className="card-enterprise border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
                <div className="card-header-enterprise border-red-100 dark:border-red-900/50">
                  <div className="flex items-center gap-2">
                    <div className="icon-glass icon-glass-md icon-glass-red">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-red-800 dark:text-red-300">
                      Safety Critical Findings
                    </h3>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  {inspection.safety_findings.map((finding, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-white/60 dark:bg-slate-900/40 rounded-lg"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-[13px] text-red-900 dark:text-red-200">{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {inspection.action_items?.length > 0 && (
              <div className="card-enterprise">
                <div className="card-header-enterprise">
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">Prioritized Action Items</h3>
                </div>
                <div className="p-5 space-y-3">
                  {inspection.action_items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                    >
                      <div
                        className={`icon-glass icon-glass-lg flex items-center justify-center flex-shrink-0 font-bold text-[14px] ${
                          item.priority === 1
                            ? "icon-glass-red text-red-700 dark:text-red-400"
                            : item.priority === 2
                            ? "icon-glass-amber text-amber-700 dark:text-amber-400"
                            : "text-slate-600 dark:text-white"
                        }`}
                      >
                        {item.priority}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[14px] text-slate-900 dark:text-white">{item.action}</p>
                        {item.why && (
                          <p className="text-[13px] text-slate-600 dark:text-white mt-1.5">
                            <span className="font-medium text-slate-700 dark:text-white">Why:</span> {item.why}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            item.priority === 1 
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : "text-slate-600 dark:text-white"
                          }`}>
                            {item.risk}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist">
            <div className="card-enterprise overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-enterprise">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Item</th>
                      <th>Result</th>
                      <th>Severity</th>
                      <th>Evidence</th>
                      <th>Recommended Action</th>
                      <th>Confidence</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.checklist?.map((item) => (
                      <tr key={item.id} data-testid={`checklist-row-${item.id}`}>
                        <td className="font-medium text-slate-900 dark:text-white">{item.category}</td>
                        <td>{item.item}</td>
                        <td>
                          {editingItem === item.id ? (
                            <Select
                              defaultValue={item.result}
                              onValueChange={(value) => handleChecklistUpdate(item.id, value)}
                            >
                              <SelectTrigger className="w-28 h-8 text-[12px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PASS">PASS</SelectItem>
                                <SelectItem value="FAIL">FAIL</SelectItem>
                                <SelectItem value="MONITOR">MONITOR</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusBadge status={item.result} />
                          )}
                        </td>
                        <td>
                          <SeverityBadge severity={item.severity} />
                        </td>
                        <td>
                          {item.evidence ? (
                            <span className="text-blue-600 dark:text-blue-400 text-[12px] hover:underline cursor-pointer">{item.evidence}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-white/70">—</span>
                          )}
                        </td>
                        <td className="max-w-[200px]">
                          <span className="text-[12px] text-slate-600 dark:text-white line-clamp-2">
                            {item.recommended_action || "—"}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="fitment-bar w-16">
                              <div 
                                className="fitment-bar-fill" 
                                style={{ width: `${Math.round(item.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="text-[12px] text-slate-600 dark:text-white font-mono">
                              {Math.round(item.confidence * 100)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {editingItem !== item.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#F7B500]"
                              onClick={() => setEditingItem(item.id)}
                              data-testid={`edit-checklist-${item.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <div className="card-enterprise p-5">
              <MediaGallery media={inspection.media || []} />
            </div>
          </TabsContent>

          {/* Parts Tab */}
          <TabsContent value="parts">
            <PartsMatchList parts={inspection.parts_matches || []} />
          </TabsContent>

          {/* Connect Tab */}
          <TabsContent value="connect">
            <ConnectClusters clusters={inspection.similar_inspections || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
