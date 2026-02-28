import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown,
  LayoutDashboard,
  HardHat
} from "lucide-react";

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const isActive = (path) => location.pathname.includes(path);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate("/app/dashboard")}
          data-testid="logo-link"
        >
          <div className="w-10 h-10 bg-[#F7B500] rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <HardHat className="w-5 h-5 text-slate-900" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[17px] text-slate-900 dark:text-white leading-tight tracking-tight">
              Cat Inspect
            </span>
            <span className="text-[10px] text-[#F7B500] font-bold tracking-[0.2em] uppercase">
              AI Platform
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`font-medium text-[14px] h-9 px-3 ${
              isActive("dashboard") 
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            onClick={() => navigate("/app/dashboard")}
            data-testid="nav-dashboard"
          >
            <LayoutDashboard className="w-4 h-4 mr-1.5" />
            Dashboard
          </Button>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          onClick={toggleTheme}
          data-testid="theme-toggle"
        >
          {isDark ? (
            <Sun className="w-[18px] h-[18px]" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 h-10 px-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              data-testid="profile-dropdown-trigger"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F7B500] to-[#E5A800] flex items-center justify-center shadow-sm">
                <span className="text-[13px] font-bold text-slate-900">SN</span>
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">Sriram N.</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Inspector</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[14px] font-semibold text-slate-900 dark:text-white">Sriram Nagarajan</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Field Inspector • Dallas Region</p>
            </div>
            <div className="py-1">
              <DropdownMenuItem className="cursor-pointer text-[13px] py-2 px-3 text-slate-700 dark:text-slate-300" data-testid="settings-menu-item">
                <Settings className="w-4 h-4 mr-2.5 text-slate-400" />
                Settings
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <div className="py-1">
              <DropdownMenuItem className="cursor-pointer text-[13px] py-2 px-3 text-red-600 dark:text-red-400" data-testid="logout-menu-item">
                <LogOut className="w-4 h-4 mr-2.5" />
                Sign Out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
