import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
