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
import { StatusBadge } from "./StatusBadge";
import { 
  Search, 
  SlidersHorizontal, 
  Download, 
  FileText, 
  Link2,
  ChevronRight,
  ClipboardList
} from "lucide-react";

export const InspectionTable = ({ inspections, onSearch, onFilter }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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

  return (
    <div className="card-enterprise h-full flex flex-col" data-testid="inspections-card">
      {/* Header */}
      <div className="card-header-enterprise">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                Previous Inspections
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                {inspections.length} records
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-fit h-9 text-[13px] font-medium border-slate-200 dark:border-slate-700"
            data-testid="export-btn"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              <SlidersHorizontal className="w-4 h-4 mr-2 text-slate-400" />
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
              <th className="w-[35%]">Equipment</th>
              <th className="w-[15%]">Date</th>
              <th className="w-[12%]">Report</th>
              <th className="w-[15%]">Status</th>
              <th className="w-[23%]">Actions</th>
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F7B500]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#F7B500]">
                        {inspection.equipment_model.split(' ')[1]?.substring(0, 3) || 'CAT'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[14px] text-slate-900 dark:text-white group-hover:text-[#F7B500] transition-colors">
                        {inspection.equipment_model}
                      </p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 font-mono">
                        {inspection.serial_number}
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="text-[13px] text-slate-600 dark:text-slate-400">
                    {inspection.date}
                  </span>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-[13px] text-slate-600 dark:text-slate-400 hover:text-[#F7B500] hover:bg-[#F7B500]/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/inspections/${inspection.id}`);
                    }}
                    data-testid={`view-report-${inspection.id}`}
                  >
                    <FileText className="w-4 h-4 mr-1" />
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
                      className="h-8 px-2.5 text-[13px] text-slate-600 dark:text-slate-400 hover:text-[#F7B500] hover:bg-[#F7B500]/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/inspections/${inspection.id}?tab=connect`);
                      }}
                      data-testid={`find-similar-${inspection.id}`}
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      Similar
                    </Button>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </td>
              </tr>
            ))}
            {inspections.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <ClipboardList className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-[14px] text-slate-500 dark:text-slate-400">No inspections found</p>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InspectionTable;
