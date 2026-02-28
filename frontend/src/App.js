import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import NewInspection from "@/pages/NewInspection";
import LiveInspection from "@/pages/LiveInspection";
import InspectionDetail from "@/pages/InspectionDetail";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inspections/new" element={<NewInspection />} />
            <Route path="inspections/:id/live" element={<LiveInspection />} />
            <Route path="inspections/:id" element={<InspectionDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
