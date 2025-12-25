import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useEffect } from "react";

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("last_path", location.pathname);
  }, [location]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-16 flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;

