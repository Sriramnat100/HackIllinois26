import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950 page-enter" data-testid="dashboard-page">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 h-full">
        {/* Left Panel - Inspections Table */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden pb-20 lg:pb-0">
          <InspectionTable
            inspections={inspections}
            onSearch={handleSearch}
            onFilter={handleFilter}
          />
        </div>

        {/* Right Panel - Analytics */}
        <div className="lg:col-span-4 overflow-y-auto hidden lg:block pr-1">
          <AnalyticsCards analytics={analytics} />
        </div>
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
