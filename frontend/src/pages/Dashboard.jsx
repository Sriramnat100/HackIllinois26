import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BarChart3, PanelRightClose, PanelRightOpen, Bookmark } from "lucide-react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { InspectionTable } from "@/components/InspectionTable";
import { ChatDock } from "@/components/ChatDock";
import { AnalyticsCards } from "@/components/AnalyticsCards";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [savedCharts, setSavedCharts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inspectionsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/inspections`),
        axios.get(`${API_URL}/analytics`),
      ]);
      setInspections(inspectionsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchTerm) => {
    try {
      const response = await axios.get(`${API_URL}/inspections`, {
        params: { search: searchTerm },
      });
      setInspections(response.data);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleFilter = async ({ status, type }) => {
    try {
      const response = await axios.get(`${API_URL}/inspections`, {
        params: {
          status: status !== "all" ? status : undefined,
          inspection_type: type !== "all" ? type : undefined,
        },
      });
      setInspections(response.data);
    } catch (error) {
      console.error("Filter error:", error);
    }
  };

  const handleAddRow = async (payload) => {
    const response = await axios.post(`${API_URL}/inspections`, payload);
    setInspections((prev) => [response.data, ...prev]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 page-enter" data-testid="dashboard-page">
      {/* Main Content */}
      <div className="flex h-full overflow-hidden">
        {/* Main area - Inspections Table */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden pb-20 lg:pb-0 p-5 pr-0 lg:pr-2">
          <InspectionTable
            inspections={inspections}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onAddRow={handleAddRow}
          />
        </div>

        {/* Sidebar - Charts / Analytics (collapsible) */}
        {sidebarOpen ? (
          <aside
            className="hidden lg:flex lg:flex-col w-[40%] min-w-[320px] max-w-[560px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            data-testid="analytics-sidebar"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="icon-glass icon-glass-md icon-glass-amber">
                  <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Analytics</h2>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                aria-label="Close sidebar"
              >
                <PanelRightClose className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnalyticsCards analytics={analytics} />
              {savedCharts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">Saved charts</h3>
                  </div>
                  {savedCharts.map((chart) => {
                    const data = (chart.data || []).slice(0, 8).map((item, i) => ({
                      category: String(item?.category ?? item?.name ?? i),
                      count: Number(item?.count ?? item?.value ?? item?.percentage ?? 0) || 0,
                    }));
                    return data.length > 0 ? (
                      <div key={chart.id} className="analytics-card">
                        <div className="analytics-header">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                              {chart.title || "Chart"}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-white/90">From chat</p>
                          </div>
                        </div>
                        <div className="px-4 pt-3 pb-1">
                          <div className="h-28 w-full min-w-0">
                            <ResponsiveContainer width="99%" height="100%">
                              <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                                <YAxis hide domain={[0, "auto"]} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
                                />
                                <Bar dataKey="count" fill="#F7B500" radius={[4, 4, 0, 0]} barSize={14} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex flex-col items-center justify-center gap-1 w-11 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors py-4"
            aria-label="Open analytics sidebar"
            title="Open Analytics"
            data-testid="analytics-sidebar-open"
          >
            <PanelRightOpen className="w-5 h-5 text-slate-500 dark:text-white/90" />
            <span className="text-[10px] font-medium text-slate-500 dark:text-white/90">Analytics</span>
          </button>
        )}
      </div>

      {/* Chatbot Dock - Bottom Left */}
      <ChatDock
        onSaveChart={(payload) => {
          setSavedCharts((prev) => [
            ...prev,
            { id: String(Date.now()), title: payload.title || "Chart", data: payload.data || [] },
          ]);
        }}
      />

      {/* Floating Action Button - New Inspection */}
      <button
        className="fab-enterprise group"
        onClick={() => navigate("/app/inspections/new")}
        data-testid="new-inspection-fab"
        aria-label="New Inspection"
      >
        <Plus className="w-6 h-6" />
        <span className="fab-tooltip">
          New Inspection
        </span>
      </button>
    </div>
  );
}
