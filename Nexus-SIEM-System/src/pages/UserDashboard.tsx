import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import Alert from "@/components/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Activity } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hook/use-toast";
import { formatTimestamp, generateSecureRandomId } from "@/lib/utils";

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  source: string;
}

type Notification = {
  id: number;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  title?: string;
  source?: string;
  severity?: "critical" | "high" | "medium" | "low";
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

const mapSeverity = (sev: any): "critical" | "high" | "medium" | "low" => {
  if (typeof sev === 'string') return sev.toLowerCase() as any;
  if (sev === 4) return 'critical';
  if (sev === 3) return 'high';
  if (sev === 2) return 'medium';
  return 'low';
};

export default function UserDashboard() {
  const [recentAlerts, setRecentAlerts] = React.useState<AlertItem[]>([]);
  const [activeCount, setActiveCount] = React.useState(0);
  const [resolvedCount, setResolvedCount] = React.useState(0);
  const [logsCount, setLogsCount] = React.useState(0);
  const [alertsCount, setAlertsCount] = React.useState(0);

  const [threatCategories, setThreatCategories] = React.useState<{ name: string; count: number; percentage: number }[]>([]);

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
        const [detectionRes, alertsRes, authLogsRes, sysLogsRes, errLogsRes, notificationsRes] = await Promise.all([
          fetch('/api/detections?status=new'),
          fetch('/api/alerts'),
          fetch('/api/logs?logType=authentication'),
          fetch('/api/logs?logType=system'),
          fetch('/api/logs?logType=error'),
          fetch('/api/notifications')
        ]);

        const [detectionData, alertsData, authLogsData, sysLogsData, errLogsData, notificationsData] = await Promise.all([
          detectionRes.json(),
          alertsRes.json(),
          authLogsRes.json(),
          sysLogsRes.json(),
          errLogsRes.json(),
          notificationsRes.json()
        ]);

        let count = 0;
        let allItems: AlertItem[] = [];

        if (alertsData.success && Array.isArray(alertsData.alerts)) {
          const mappedAlerts = alertsData.alerts.map((a: any) => ({
            id: a.ALERT_ID ? a.ALERT_ID.toString() : (a.id || generateSecureRandomId()),
            title: a.Title || "Untitled Alert",
            description: a.Description || "No description",
            severity: mapSeverity(a.Severity),
            time: a.Timestamp || new Date().toISOString(),
            source: a.Source || "Unknown"
          }));
          allItems.push(...mappedAlerts);
          count += alertsData.count || alertsData.alerts.length;
        }

        if (notificationsData.success && Array.isArray(notificationsData.notifications)) {
          const mappedNotifs = notificationsData.notifications
            .filter((n: any) => n.type === 'admin_alert')
            .map((n: any) => ({
              id: `notif-${n.id}`,
              title: n.title || "Admin Alert",
              description: n.message,
              severity: n.severity || "high",
              time: n.created_at,
              source: "System Admin"
            }));
          allItems.push(...mappedNotifs);
        }

        allItems.sort((a, b) => {
          const aIsNotif = a.id.startsWith('notif-');
          const bIsNotif = b.id.startsWith('notif-');
          if (aIsNotif && !bIsNotif) return -1;
          if (!aIsNotif && bIsNotif) return 1;
          return new Date(b.time).getTime() - new Date(a.time).getTime();
        });

        if (allItems.length === 0) {
          allItems = [
            { id: 'mock-1', title: 'System Update', description: 'System update completed successfully.', severity: 'low', time: new Date().toISOString(), source: 'System' },
            { id: 'mock-2', title: 'New Device', description: 'New device detected: iPad Pro', severity: 'medium', time: new Date(Date.now() - 3600000).toISOString(), source: 'Network' },
            { id: 'mock-3', title: 'Failed Login', description: 'Failed login attempt from 192.168.1.100', severity: 'high', time: new Date(Date.now() - 7200000).toISOString(), source: 'Auth' },
            { id: 'mock-4', title: 'Disk Usage', description: 'Disk usage exceeding 80% on /var/log', severity: 'medium', time: new Date(Date.now() - 10800000).toISOString(), source: 'System' },
            { id: 'mock-5', title: 'Firewall Alert', description: 'Port 22 access blocked from external IP', severity: 'high', time: new Date(Date.now() - 14400000).toISOString(), source: 'Firewall' },
            { id: 'mock-6', title: 'Service Restart', description: 'Nginx service restarted', severity: 'low', time: new Date(Date.now() - 18000000).toISOString(), source: 'System' },
          ];
        }

        setRecentAlerts(allItems);

        if (detectionData.success && Array.isArray(detectionData.detections)) {
          const categoryCounts: Record<string, number> = {};
          detectionData.detections.forEach((d: any) => {
            const cat = d.Rule_Name || "Unknown";
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });

          const totalAlerts = detectionData.detections.length;
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

        if (authLogsData.success) count += authLogsData.logs?.length || 0;
        if (sysLogsData.success) count += sysLogsData.logs?.length || 0;
        if (errLogsData.success) count += errLogsData.logs?.length || 0;

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
        toast({ title: "Cleaned", description: "Alerts and notifications cleared." });
      } else {
        console.error("Failed to clean alerts:", alertsData.error, notifyData.error);
      }
    } catch (err) {
      console.error("Error cleaning alerts:", err);
    }
  }

  function setVisibleCount(arg0: (prev: any) => any): void {
    throw new Error("Function not implemented.");
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
       
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent alerts.</p>
            ) : (
              recentAlerts.map((alert, index) => (
                <Alert
                  key={alert.id || `alert-${index}`}
                  title={alert.title}
                  description={alert.description}
                  severity={alert.severity}
                  time={formatTimestamp(alert.time)}
                  source={alert.source}
                />
              ))
            )}
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
                          <p className="text-sm font-medium text-foreground">{device.type}</p>
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
