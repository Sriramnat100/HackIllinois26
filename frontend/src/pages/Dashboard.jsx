import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BarChart3, PanelRightClose, PanelRightOpen } from "lucide-react";
import axios from "axios";
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
            <div className="flex-1 overflow-y-auto p-4">
              <AnalyticsCards analytics={analytics} />
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
      <ChatDock />

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
