import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors">
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
