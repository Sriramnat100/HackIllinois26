import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "./StatusBadge";
import { 
  Search, 
  SlidersHorizontal, 
  Download, 
  FileText, 
  FileSpreadsheet,
  Link2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Plus
} from "lucide-react";
import { GoogleDocsIcon } from "@/components/icons/GoogleDocsIcon";

const defaultNewRow = {
  equipment_model: "",
  serial_number: "",
  customer: "",
  location: "",
  inspection_type: "Daily Walkaround",
};

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const InspectionTable = ({ inspections, onSearch, onFilter, onAddRow }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedInspectionId, setSelectedInspectionId] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRow, setNewRow] = useState(defaultNewRow);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setNewRow(defaultNewRow);
    setAddDialogOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!onAddRow) return;
    setSubmitting(true);
    try {
      await onAddRow(newRow);
      setAddDialogOpen(false);
    } catch (err) {
      console.error("Add row error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    onFilter?.({ status: value, type: typeFilter });
  };

  const handleTypeFilter = (value) => {
    setTypeFilter(value);
    onFilter?.({ status: statusFilter, type: value });
  };

  const handleExportPdfClick = () => {
    setSelectedInspectionId(inspections.length ? inspections[0].id : "");
    setPdfDialogOpen(true);
  };

  const handleDownloadPdf = () => {
    if (!selectedInspectionId) return;
    setExportingPdf(true);
    const url = `${API_URL}/export/inspection/${encodeURIComponent(selectedInspectionId)}/pdf`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `inspection-report-${selectedInspectionId}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
        setPdfDialogOpen(false);
      })
      .catch(() => setExportingPdf(false))
      .finally(() => setExportingPdf(false));
  };

  const handleExportAllCsv = () => {
    const url = `${API_URL}/export/all`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.text();
      })
      .then((text) => {
        const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cat-inspect-export-all.csv";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(console.error);
  };

  const handleExportAllExcel = () => {
    const url = `${API_URL}/export/all/excel`;
    fetch(url, { method: "GET" })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlObj;
        a.download = "cat-inspect-export-all.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(urlObj), 2000);
      })
      .catch(() => {
        window.open(url, "_blank");
      });
  };

  const handleExport = () => {
    const headers = ["Asset ID", "Owning Org", "Equipment Model", "Serial Number", "Customer", "Location", "Date", "Status", "Inspection Type"];
    const rows = inspections.map((i) => [
      i.asset_id ?? i.serial_number ?? "",
      i.owning_org ?? i.customer ?? "",
      i.equipment_model ?? "",
      i.serial_number ?? "",
      i.customer ?? "",
      i.location ?? "",
      i.date ?? "",
      i.status ?? "",
      i.inspection_type ?? "",
    ]);
    const escape = (v) => {
      const s = String(v ?? "");
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspections-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-enterprise h-full flex flex-col" data-testid="inspections-card">
      {/* Header */}
      <div className="card-header-enterprise">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="icon-glass icon-glass-lg">
              <ClipboardList className="w-5 h-5 text-slate-600 dark:text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                Previous Inspections
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-white/90">
                {inspections.length} records
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-fit h-9 text-[13px] font-medium border-slate-200 dark:border-slate-700"
                data-testid="export-btn"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export
                <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[260px]">
              <DropdownMenuItem onClick={handleExportPdfClick}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF (single report)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAllCsv}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export All – CSV (more detail, for Google Sheets)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAllExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export All – Excel (with charts)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-fit h-9 text-[13px] font-medium border-slate-200 dark:border-slate-700"
              onClick={handleOpenAdd}
              data-testid="add-row-btn"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add row
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-fit h-9 text-[13px] font-medium border-slate-200 dark:border-slate-700"
              onClick={handleExport}
              data-testid="export-btn"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export
            </Button>
          </div>
        </div>

        {/* Add row dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">Add inspection manually</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="equipment_model" className="text-slate-700 dark:text-white">Equipment model</Label>
                <Input
                  id="equipment_model"
                  placeholder="e.g. CAT 320"
                  value={newRow.equipment_model}
                  onChange={(e) => setNewRow((p) => ({ ...p, equipment_model: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="serial_number" className="text-slate-700 dark:text-white">Serial / Asset ID</Label>
                <Input
                  id="serial_number"
                  placeholder="e.g. CAT0320X12345"
                  value={newRow.serial_number}
                  onChange={(e) => setNewRow((p) => ({ ...p, serial_number: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer" className="text-slate-700 dark:text-white">Owning org / Customer</Label>
                <Input
                  id="customer"
                  placeholder="e.g. BuildCo Industries"
                  value={newRow.customer}
                  onChange={(e) => setNewRow((p) => ({ ...p, customer: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location" className="text-slate-700 dark:text-white">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Site A"
                  value={newRow.location}
                  onChange={(e) => setNewRow((p) => ({ ...p, location: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-slate-700 dark:text-white">Inspection type</Label>
                <Select
                  value={newRow.inspection_type}
                  onValueChange={(v) => setNewRow((p) => ({ ...p, inspection_type: v }))}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily Walkaround">Daily Walkaround</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                    <SelectItem value="TA1">TA1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-[#F7B500] hover:bg-[#E5A800] text-slate-900">
                  {submitting ? "Adding…" : "Add row"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/80" />
            <Input
              placeholder="Search by model, serial, or customer..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[13px]"
              data-testid="search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[150px] h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[13px]" data-testid="status-filter">
              <SlidersHorizontal className="w-4 h-4 mr-2 text-slate-400 dark:text-white/80" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pass">PASS</SelectItem>
              <SelectItem value="fail">FAIL</SelectItem>
              <SelectItem value="monitor">MONITOR</SelectItem>
              <SelectItem value="in progress">In Progress</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={handleTypeFilter}>
            <SelectTrigger className="w-[170px] h-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[13px]" data-testid="type-filter">
              <SelectValue placeholder="Inspection Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="daily walkaround">Daily Walkaround</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="ta1">TA1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="table-enterprise">
          <thead>
            <tr>
              <th className="w-[14%]">Asset ID</th>
              <th className="w-[18%]">Owning org</th>
              <th className="w-[22%]">Equipment</th>
              <th className="w-[10%]">Date</th>
              <th className="w-[10%]">Report</th>
              <th className="w-[12%]">Status</th>
              <th className="w-[14%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((inspection) => (
              <tr 
                key={inspection.id} 
                className="table-row-clickable group"
                onClick={() => navigate(`/app/inspections/${inspection.id}`)}
                data-testid={`inspection-row-${inspection.id}`}
              >
                <td>
                  <span className="text-[13px] font-mono text-slate-700 dark:text-white">
                    {inspection.asset_id ?? inspection.serial_number}
                  </span>
                </td>
                <td>
                  <span className="text-[13px] text-slate-600 dark:text-white">
                    {inspection.owning_org ?? inspection.customer}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="icon-glass icon-glass-xl icon-glass-amber flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#F7B500]">
                        {inspection.equipment_model?.split(' ')[1]?.substring(0, 3) || 'CAT'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[14px] text-slate-900 dark:text-white group-hover:text-[#F7B500] transition-colors">
                        {inspection.equipment_model}
                      </p>
                      <p className="text-[12px] text-slate-500 dark:text-white/90 font-mono">
                        {inspection.serial_number}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  <span className="text-[13px] text-slate-600 dark:text-white">
                    {inspection.date}
                  </span>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-[13px] text-slate-600 dark:text-white hover:text-[#F7B500] hover:bg-[#F7B500]/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/inspections/${inspection.id}`);
                    }}
                    data-testid={`view-report-${inspection.id}`}
                  >
                    <GoogleDocsIcon className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </td>
                <td>
                  <StatusBadge status={inspection.status} />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-[13px] text-slate-600 dark:text-white hover:text-[#F7B500] hover:bg-[#F7B500]/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/inspections/${inspection.id}?tab=connect`);
                      }}
                      data-testid={`find-similar-${inspection.id}`}
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      Similar
                    </Button>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </td>
              </tr>
            ))}
            {inspections.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <ClipboardList className="w-10 h-10 text-slate-300 dark:text-white/70 mb-3" />
                    <p className="text-[14px] text-slate-500 dark:text-white/90">No inspections found</p>
                    <p className="text-[12px] text-slate-400 dark:text-white/90 mt-1">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export report as PDF</DialogTitle>
            <DialogDescription>
              Choose an inspection to download as a PDF report. The file includes summary, findings, checklist, and action items.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Inspection</label>
            <Select value={selectedInspectionId} onValueChange={setSelectedInspectionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select inspection" />
              </SelectTrigger>
              <SelectContent>
                {inspections.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.equipment_model} – {i.date} ({i.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownloadPdf} disabled={!selectedInspectionId || exportingPdf}>
              {exportingPdf ? "Downloading…" : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
