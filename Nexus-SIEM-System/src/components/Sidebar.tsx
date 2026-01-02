import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, AlertTriangle, User, Server, LogOut, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useAuth } from "@/hook/useAuth";

const navigation = [
  { name: "Home", href: "/", icon: Home, roles: ["Admin", "Analyst"] },
  { name: "Logs", href: "/logs", icon: FileText, roles: ["Admin", "Analyst"] },
  { name: "Active Incidents", href: "/incidents", icon: AlertTriangle, roles: ["Admin"] },
  { name: "Resolved Incidents", href: "/resolved-incidents", icon: CheckCircle, roles: ["Admin"] },
  { name: "My Incidents", href: "/user-incidents", icon: AlertTriangle, roles: ["Analyst"] },
  { name: "Admin Panel", href: "/AdminPanel", icon: User, roles: ["Admin"] },
  { name: "Availability", href: "/availability", icon: Server, roles: ["Admin"] },
  { name: "User Profile", href: "/user-profile", icon: User, roles: ["Analyst"] },
];

export default function Sidebar() {
  const location = useLocation();
  const { role: userRole } = useAuth();
  const navigate = useNavigate();

  const normalizedUserRole = userRole?.toLowerCase();

  const mainNavigation = navigation.filter((item) => {
    if (item.name === "Admin Panel" || item.name === "User Profile") return false;
    return item.roles.some(role => role.toLowerCase() === normalizedUserRole);
  });

  const adminItem = (normalizedUserRole === 'admin') ? navigation.find((n) => n.name === "Admin Panel") : null;
  const userProfileItem = (normalizedUserRole === 'analyst') ? navigation.find((n) => n.name === "User Profile") : null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col items-center py-4 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-black overflow-hidden">
          <img
            src="/Application_Logo.png"
            alt="Application Logo"
            className="h-full w-full object-contain"
          />
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {mainNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                title={item.name}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
        {adminItem && (
          <Link
            to={adminItem.href}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              location.pathname === adminItem.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title={adminItem.name}
          >
            <adminItem.icon className="h-5 w-5" />
          </Link>
        )}
        {userProfileItem && (
          <Link
            to={userProfileItem.href}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              location.pathname === userProfileItem.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title={userProfileItem.name}
          >
            <userProfileItem.icon className="h-5 w-5" />
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
