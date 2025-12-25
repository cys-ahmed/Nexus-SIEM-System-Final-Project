import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Logs from "./pages/Logs";
import UserIncidents from "./pages/UserIncidents";
import AdminIncidents from "./pages/AdminIncidents";
import AdminIncidentsResolved from "./pages/AdminIncidentsResolved";
import AdminPanel from "./pages/AdminPanel";
import Availability from "./pages/Availability";
import UserProfile from "./pages/UserProfile";
import UserResetPassword from "./pages/UserResetPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import { useAuth } from "@/hook/useAuth";

const DashboardSwitcher = () => {
  const { role } = useAuth();
  if (role === 'Admin' || role === 'Super User') return <AdminDashboard />;
  if (role === 'Analyst' || role === 'User') return <UserDashboard />;
  return <Navigate to="/login" replace />;
};


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/incidents" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminIncidents /></ProtectedRoute>} />
            <Route path="/resolved-incidents" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminIncidentsResolved /></ProtectedRoute>} />
            <Route path="/AdminPanel" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminPanel /></ProtectedRoute>} />
            <Route path="/admin/reset-password" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminResetPassword /></ProtectedRoute>} />
            <Route path="/availability" element={<ProtectedRoute allowedRoles={["Admin"]}><Availability /></ProtectedRoute>} />

            <Route path="/" element={<ProtectedRoute allowedRoles={["Admin", "Analyst"]}><DashboardSwitcher /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute allowedRoles={["Admin", "Analyst"]}><Logs /></ProtectedRoute>} />

            <Route path="/user-incidents" element={<ProtectedRoute allowedRoles={["Analyst"]}><UserIncidents /></ProtectedRoute>} />
            <Route path="/user-profile" element={<ProtectedRoute allowedRoles={["Analyst"]}><UserProfile /></ProtectedRoute>} />
            <Route path="/user/reset-password" element={<ProtectedRoute allowedRoles={["Analyst"]}><UserResetPassword /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<h1>404 - Not Found</h1>} />
        </Routes>

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
