import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
