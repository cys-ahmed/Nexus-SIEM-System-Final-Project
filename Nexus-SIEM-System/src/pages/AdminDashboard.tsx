import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import Alert from "@/components/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Activity } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";
import { toast } from "@/hook/use-toast";

export default function AdminDashboard() {
  interface AlertItem {
    id: string;
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    time: string;
    source: string;
  }

  const [recentAlerts, setRecentAlerts] = React.useState<AlertItem[]>([]);
  const [activeCount, setActiveCount] = React.useState(0);
  const [resolvedCount, setResolvedCount] = React.useState(0);
  const [logsCount, setLogsCount] = React.useState(0);
  const [alertsCount, setAlertsCount] = React.useState(0);

  const [threatCategories, setThreatCategories] = React.useState<{ name: string; count: number; percentage: number }[]>([]);

  type Notification = {
    id: number;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  };

  interface Device {
    id: number;
    name: string;
    type: string;
    status: string;
    ip: string;
  }

  interface User {
    user_id: number;
    username: string;
    email: string;
    role_name: string;
  }

  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);

  React.useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotifications(data.notifications.filter((n: Notification) => n.type === 'admin_alert'));
        }
      })
      .catch(err => console.error("Notifications fetch failed:", err));

    setActiveCount(0);

    const fetchActiveIncidents = async () => {
      try {
        const [activeRes, authLogsRes, sysLogsRes, errLogsRes] = await Promise.all([
          fetch('/api/alerts?status=active'),
          fetch('/api/logs?logType=authentication'),
          fetch('/api/logs?logType=system'),
          fetch('/api/logs?logType=error')
        ]);

        const activeData = await activeRes.json();
        const authLogsData = await authLogsRes.json();
        const sysLogsData = await sysLogsRes.json();
        const errLogsData = await errLogsRes.json();

        let count = 0;

        if (activeData.success && Array.isArray(activeData.alerts)) {
          const getSeverity = (sev: number | string) => {
            const s = typeof sev === 'string' ? Number.parseInt(sev) : sev;
            if (s >= 4) return "critical";
            if (s === 3) return "high";
            if (s === 2) return "medium";
            return "low";
          };

          const criticalOrHigh = activeData.alerts.filter((a: { Severity: number }) => {
            const sev = getSeverity(a.Severity);
            return sev === 'critical' || sev === 'high';
          });

          count += criticalOrHigh.length;

          // Also set recent alerts from active alerts
          const mappedAlerts = activeData.alerts.slice(0, 10).map((a: any) => ({
            id: a.ALERT_ID ? a.ALERT_ID.toString() : (a.id ? a.id.toString() : Math.random().toString()),
            title: a.Title || a.title,
            description: a.Description || a.description,
            severity: getSeverity(a.Severity || a.severity),
            time: a.Timestamp || a.created_at || new Date().toISOString(),
            source: a.Source || a.source
          }));
          setRecentAlerts(mappedAlerts);

          // Derive threat categories from alerts
          const categoryCounts: Record<string, number> = {};
          activeData.alerts.forEach((a: any) => {
            const cat = a.Title || "Unknown";
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });

          const totalAlerts = activeData.alerts.length;
          const derivedCategories = Object.entries(categoryCounts)
            .map(([name, count]) => ({
              name,
              count,
              percentage: totalAlerts > 0 ? Math.round((count / totalAlerts) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setThreatCategories(derivedCategories);
        }

        if (authLogsData.success && Array.isArray(authLogsData.logs)) {
          count += authLogsData.logs.length;
        }

        if (sysLogsData.success && Array.isArray(sysLogsData.logs)) {
          count += sysLogsData.logs.length;
        }

        if (errLogsData.success && Array.isArray(errLogsData.logs)) {
          count += errLogsData.logs.length;
        }

        setActiveCount(count);
      } catch (err) {
        console.error("Active incidents count fetch failed:", err);
      }
    };
    fetchActiveIncidents();

    fetch('/api/resolved-incidents')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setResolvedCount(data.count);
        }
      })
      .catch(err => console.error("Resolved incidents fetch failed:", err));

    fetch('/api/logs/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.stats) {
          setLogsCount(data.stats.total);
        }
      })
      .catch(err => console.error("Logs stats fetch failed:", err));

    fetch('/api/devices')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const mappedDevices = data.devices.map((d: { Device_Id: number; Device_type: string; Device_Status: string; Ip_Address: string }) => ({
            id: d.Device_Id,
            name: d.Device_Id.toString(),
            type: d.Device_type,
            status: d.Device_Status === 'active' ? 'Online' : 'Offline',
            ip: d.Ip_Address
          }));
          setDevices(mappedDevices);
        }
      })
      .catch(err => console.error("Devices fetch failed:", err));

    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.users);
        }
      })
      .catch(err => console.error("Users fetch failed:", err));
  }, []);

  React.useEffect(() => {
    const totalCount = recentAlerts.length + notifications.length;
    setAlertsCount(totalCount);
  }, [notifications, recentAlerts]);
  async function removeNotification(id: number) {
    try {
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        // Rollback on failure
        const data = await res.json().catch(() => ({}));
        console.error('Failed to delete notification:', data);
        // Re-fetch to restore state accurately
        const refetch = await fetch('/api/notifications');
        const refetchData = await refetch.json();
        if (refetchData.success) {
          setNotifications(refetchData.notifications.filter((n: Notification) => n.type === 'admin_alert'));
        }
        toast({
          title: "Error",
          description: "Failed to delete notification.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Notification delete error:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting notification.",
        variant: "destructive",
      });
    }
  }


  async function removeAlert(index: number) {
    const alertToRemove = recentAlerts[index];
    if (alertToRemove.id) {
      try {
        // Optimistic update
        const newAlerts = [...recentAlerts];
        newAlerts.splice(index, 1);
        setRecentAlerts(newAlerts);

        await fetch(`/api/alerts/${alertToRemove.id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error("Failed to delete alert:", error);
        // Rollback if needed (optional, but good practice)
      }
    }
  }

  async function cleanAlertList() {
    try {
      const [alertsRes, notifyRes] = await Promise.all([
        fetch('/api/alerts', { method: 'DELETE' }),
        fetch('/api/notifications', { method: 'DELETE' })
      ]);

      const alertsData = await alertsRes.json();
      const notifyData = await notifyRes.json();

      if (alertsData.success && notifyData.success) {
        setRecentAlerts([]);
        setNotifications([]);
        toast({
          title: "Alerts Cleared",
          description: "All alerts and notifications have been deleted from the database.",
        });
      } else {
        console.error("Failed to clean some data", { alertsData, notifyData });
        toast({
          title: "Error",
          description: "Failed to clear some alerts or notifications.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error cleaning alert list:", error);
      toast({
        title: "Error",
        description: "An error occurred while cleaning alerts.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="flex-1">
      <Header
        title="Security Overview"
        subtitle="Real-time security monitoring and threat detection"
        includeLogs={false}
        securityOverview={{
          openIncidents: activeCount,
          resolvedIncidents: resolvedCount,
          securityLogs: logsCount,
          assetsMonitored: 0,
          recentAlerts: recentAlerts,
          threatCategories: threatCategories,
          topAffectedSystems: []
        }}
      />
      <main className="p-8 space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Resolved Incidents"
            value={resolvedCount.toString()}
            icon={Shield}
            variant="success"
            titleColor="text-green-600"
          />
          <StatCard
            title="Open Incidents"
            value={activeCount.toString()}
            icon={AlertTriangle}
            variant="danger"
            titleColor="text-red-600"
          />
          <StatCard
            title="Security Logs"
            value={logsCount.toString()}
            icon={Activity}
            variant="warning"
            titleColor="text-yellow-600"
          />
          <StatCard
            title="Alerts"
            value={alertsCount.toString()}
            icon={AlertTriangle}
            variant="default"
            titleColor="text-blue-600"
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Security Alerts</CardTitle>
            <Button variant="destructive" size="sm" onClick={cleanAlertList}>
              Clean Alert List
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.map((notification) => (
              <Alert
                key={`notify-${notification.id}`}
                title="Admin Alert"
                description={notification.message}
                severity="critical"
                time={formatTimestamp(notification.created_at)}
                source="System Admin"
                onRemove={() => removeNotification(notification.id)}
              />
            ))}
            {recentAlerts.map((alert, index) => (
              <Alert key={alert.id || `alert-${index}`} {...alert} time={formatTimestamp(alert.time)} onRemove={() => removeAlert(index)} />
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Threat Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threatCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No active threats detected.</p>
                ) : (
                  threatCategories.map((category) => (
                    <div key={category.name}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{category.name}</span>
                        <span className="font-medium text-foreground">{category.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Devices ({devices.length})</h3>
                  <div className="space-y-2">
                    {devices.slice(0, 5).map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{device.name}</p>
                          <p className="text-xs text-muted-foreground">{device.type} • {device.ip}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${device.status === "Online"
                              ? "bg-green-500"
                              : "bg-red-500"
                              }`}
                          />
                          <span className="text-xs text-muted-foreground">{device.status}</span>
                        </div>
                      </div>
                    ))}
                    {devices.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No devices found</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Users ({users.length})</h3>
                  <div className="space-y-2">
                    {users.slice(0, 5).map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">{user.role_name}</div>
                      </div>
                    ))}
                    {users.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
