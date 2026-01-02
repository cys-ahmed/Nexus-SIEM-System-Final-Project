import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Bell,
  Loader2,
  Trash2,
  ChevronDown,
  UserPlus,
  Users
} from "lucide-react";

import Header from "@/components/Header";
import Alert from "@/components/Alert";
import AlertCard from "@/components/AlertCard";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import * as Select from "@radix-ui/react-select";

import { toast } from "@/hook/use-toast";
import { useAuth } from "@/hook/useAuth";
import { getAuthHeaders, logout } from "@/lib/auth";
import { formatTimestamp, generateSecureRandomId, getSeverityString } from "@/lib/utils";
import { severityOptions } from "@/lib/constants";

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  time: string;
  source: string;
  status: "active" | "resolved";
  backendId?: number;
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
  recovery?: number;
  stage?: string;
};

type Severity = "critical" | "high" | "medium" | "low";

type AdminReportState = {
  incident: { id: string; title: string; description: string; severity: Severity; time: string; source: string };
  recovery?: number;
  stages?: string[];
  notes?: string;
};

export default function AdminPanel() {
  const location = useLocation();
  const { user: currentUser } = useAuth();


  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [openGenerateAlert, setOpenGenerateAlert] = useState(false);
  const [adminAlertMessage, setAdminAlertMessage] = useState("");


  const [users, setUsers] = useState<Array<{ user_id: number; username: string; email: string; role_name: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [openAddUser, setOpenAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Analyst");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [openAlertModal, setOpenAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDescription, setAlertDescription] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<Severity>("medium");
  const [alertSource, setAlertSource] = useState("");
  const [deviceOptions, setDeviceOptions] = useState<{ id: number; name: string; ip: string }[]>([]);
  const [alertError, setAlertError] = useState("");





  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Notifications fetch failed:", error);
    }
  }, []);

  const mapAlertFromApi = (a: any): AlertItem => {
    const id = a.ALERT_ID?.toString() || a.id?.toString() || generateSecureRandomId();
    return {
      id,
      title: a.Title || a.title,
      description: a.Description || a.description,
      severity: getSeverityString(Number(a.Severity || a.severity)),
      time: formatTimestamp(a.Timestamp || a.created_at || new Date().toISOString()),
      source: a.Source || a.source,
      status: a.Status || a.status || 'active',
      backendId: a.ALERT_ID || a.id
    };
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts', { cache: 'no-store' });
      const data = await response.json();
      if (data.success && Array.isArray(data.alerts)) {

        const mappedAlerts: AlertItem[] = data.alerts.map(mapAlertFromApi);
        setAlerts(mappedAlerts);
      } else {
        console.warn("Failed to load alerts or empty list:", data);
      }
    } catch (e) {
      console.error("Failed to load alerts:", e);
      toast({
        title: "Error",
        description: "Failed to load alerts from server.",
        variant: "destructive",
      });
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      if (data.success && Array.isArray(data.devices)) {
        setDeviceOptions(data.devices.map((d: any) => ({
          id: d.Device_Id,
          name: d.Hostname || `Device-${d.Device_Id}`,
          ip: d.Ip_Address
        })));
      }
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };


  useEffect(() => {
    fetchNotifications();
    loadAlerts();
    fetchDevices();
    fetchUsers();


    const intervalId = setInterval(() => {
      fetchNotifications();
      loadAlerts();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fetchNotifications]);


  useEffect(() => {
    const s = location.state as unknown as AdminReportState | null;
    if (s?.incident) {
      const saveNotification = async () => {
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: s.incident.description,
              type: 'incident_report',
              title: s.incident.title,
              source: s.incident.source,
              severity: s.incident.severity,
              recovery: s.recovery,
              stage: s.stages?.at(-1)
            })
          });

          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: s.incident.description,
              type: 'admin_alert',
              title: s.incident.title,
              source: s.incident.source,
              severity: s.incident.severity
            })
          });

          fetchNotifications();
          toast({
            title: "Report Saved & Alert Generated",
            description: "Incident report saved and dashboard alert generated."
          });
          globalThis.history.replaceState({}, document.title);
        } catch (error) {
          console.error("Failed to save report notification:", error);
        }
      };
      saveNotification();
    }
  }, [location.state, fetchNotifications]);





  const deleteNotification = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({ title: "Notification Removed", description: "The notification has been removed." });
      }
    } catch (error) {
      console.error("Notification delete failed:", error);
      toast({ title: "Error", description: "Failed to remove notification.", variant: "destructive" });
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setNotifications([]);
        toast({ title: "All Notifications Removed", description: "All notifications have been removed." });
      }
    } catch (error) {
      console.error("Failed to delete notifications:", error);
      toast({ title: "Error", description: "Failed to remove notifications.", variant: "destructive" });
    }
  };

  async function handleGenerateAlert() {
    if (!adminAlertMessage.trim()) {
      toast({ title: "Validation Error", description: "Please enter an alert message.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: adminAlertMessage, type: 'admin_alert' })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Alert Generated", description: "The alert has been broadcast to all users." });
        setOpenGenerateAlert(false);
        setAdminAlertMessage("");
        fetchNotifications();
      }
    } catch (error) {
      console.error("Alert generation failed:", error);
      toast({ title: "Error", description: "Failed to generate alert.", variant: "destructive" });
    }
  }





  async function handleAddUser() {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserRole) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail.trim())) {
      toast({ title: "Validation Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setIsSubmittingUser(true);
    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username: newUserName.trim(), email: newUserEmail.trim(), role_name: newUserRole }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "User Added Successfully",
          description: data.message || `${data.user.username} (${data.user.email}) • Role: ${data.user.role}`
        });
        setOpenAddUser(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserRole("Analyst");
        fetchUsers();
      } else {
        toast({ title: "Error Adding User", description: data?.error || "Failed to add user", variant: "destructive" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to server.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmittingUser(false);
    }
  }

  async function performDeleteUser(userId: number) {
    setDeletingUserId(userId);
    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(null)
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: "User Deleted", description: "User has been permanently removed." });
        setUsers(currentUsers => currentUsers.filter(u => u.user_id !== userId));
        if (currentUser?.user_id === userId) {
          logout();
          globalThis.location.href = "/login";
        }
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete user", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete user due to a connection error.", variant: "destructive" });
    } finally {
      setDeletingUserId(null);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  }





  async function addAlert() {
    if (!alertTitle.trim() || !alertDescription.trim() || !alertSource.trim()) {
      setAlertError("All fields are required");
      return;
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: alertTitle.trim(),
          description: alertDescription.trim(),
          severity: alertSeverity,
          source: alertSource.trim()
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: "Success", description: "Alert rule created successfully." });
        await loadAlerts();
        setOpenAlertModal(false);
        setAlertTitle("");
        setAlertDescription("");
        setAlertSource("");
        setAlertSeverity("medium");
        setAlertError("");
      } else {
        setAlertError(data.error || 'Failed to save alert to backend');
      }
    } catch (error) {
      console.error("Failed to save alert:", error);
      setAlertError('Failed to save alert');
    }
  }

  async function removeAlert(index: number) {
    const alertToRemove = alerts[index];

    const prevAlerts = [...alerts];
    const newAlerts = [...alerts];
    newAlerts.splice(index, 1);
    setAlerts(newAlerts);

    if (alertToRemove.backendId) {
      try {
        const res = await fetch(`/api/alerts/${alertToRemove.backendId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Failed to delete");
        toast({ title: "Alert Deleted", description: "The alert has been removed from the database." });
      } catch (e) {
        console.error("Failed to delete alert:", e);
        setAlerts(prevAlerts);
        toast({ title: "Error", description: "Failed to delete alert. Please try again.", variant: "destructive" });
      }
    }
  }

  async function removeAllAlerts() {
    if (!globalThis.confirm("Are you sure you want to delete ALL alerts? This cannot be undone.")) return;
    try {
      const res = await fetch('/api/alerts', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAlerts([]);
        toast({ title: "All Alerts Cleared", description: "All alerts have been deleted from the database." });
      } else {
        throw new Error(data.error || "Failed to delete all");
      }
    } catch (e) {
      console.error("Failed to delete all alerts:", e);
      toast({ title: "Error", description: "Failed to delete all alerts.", variant: "destructive" });
    }
  }





  const profile = {
    workspaceName: "SIEM System Workspace",
    name: currentUser?.username || "Admin",
    email: currentUser?.email || "admin@example.com",
    id: currentUser?.user_id ? `ADM-${currentUser.user_id.toString().padStart(3, '0')}` : "ADM-000",
    role: currentUser?.role || "SIEM System Admin",
    avatarUrl: "/ProfilePic.png",
    accessLevel: "Full",
    twoFAEnabled: true,
    lastLogin: formatTimestamp(new Date().toISOString()),
    managedAreas: ["Alerts", "Logs", "Incidents", "Users"],
  };

  const getSeverity = (type: string) => {
    if (type === 'error' || type === 'admin_alert') return 'critical';
    if (type === 'warning') return 'high';
    return 'low';
  };

  const getNotificationTitle = (n: Notification) => n.title || (n.type === 'admin_alert' ? "Admin Alert" : "System Notification");
  const getNotificationSource = (n: Notification) => n.source || (n.type === 'admin_alert' ? "Admin" : "System");

  const renderUserContent = () => {
    if (loadingUsers) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }
    if (users.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Add a user to get started"
          actionLabel="Add User"
          onAction={() => setOpenAddUser(true)}
        />
      );
    }
    return (
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email} • {user.role_name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={user.user_id === currentUser?.user_id}
              onClick={() => {
                setUserToDelete(user.user_id);
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1">
      <Header title="Admin Panel" subtitle="System Administration & Security Controls" />
      <main className="p-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>


          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Profile Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                      <AvatarFallback>AU</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-foreground">{profile.name}</h3>
                        <Badge variant="secondary">{profile.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{profile.workspaceName}</p>
                      <p className="text-xs text-muted-foreground">ID: {profile.id}</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-medium text-foreground">{profile.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">User ID</span>
                      <span className="text-sm font-medium text-foreground">{profile.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Login</span>
                      <span className="text-sm font-medium text-foreground">{profile.lastLogin}</span>
                    </div>
                    <div className="pt-4">
                      <Link to="/admin/reset-password">
                        <Button variant="outline" className="w-full">Change Password</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>System Responsibilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">Responsibilities</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          <li>Configure and maintain alert rules</li>
                          <li>Monitor logs and investigate anomalies</li>
                          <li>Coordinate incident response workflows</li>
                          <li>Manage user access and roles</li>
                        </ul>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">Privileges</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          <li>Full access to alerts, logs, incidents</li>
                          <li>System configuration and integrations</li>
                          <li>Export and audit capabilities</li>
                          <li>Compliance and reporting tools</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage system access and user roles</CardDescription>
                </div>
                <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Username *</p>
                        <Input
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Enter username"
                          disabled={isSubmittingUser}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="test@example.com" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <Select.Root value={newUserRole} onValueChange={setNewUserRole}>
                          <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                            <Select.Value placeholder="Select role" />
                            <ChevronDown className="h-4 w-4" />
                          </Select.Trigger>
                          <Select.Content position="popper" className="max-h-[200px] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                            {["Admin", "Analyst"].map((role) => (
                              <Select.Item key={role} value={role} className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
                                <Select.ItemText>{role}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </div>
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-xs font-medium text-foreground mb-1">Temporary Password</p>
                        <p className="text-xs text-muted-foreground">Auto-generated</p>
                        <p className="text-xs text-muted-foreground mt-1">A temporary password will be provided upon creation.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setOpenAddUser(false)} disabled={isSubmittingUser}>Cancel</Button>
                      <Button onClick={handleAddUser} disabled={isSubmittingUser || !newUserName.trim() || !newUserEmail.trim() || !newUserRole}>
                        {isSubmittingUser ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                        ) : ('Create User')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {renderUserContent()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Alert Rules</CardTitle>
                  <CardDescription>Create and manage system alert definitions</CardDescription>
                </div>
                <div className="flex gap-2">
                  {alerts.length > 0 && (
                    <Button variant="destructive" onClick={removeAllAlerts}>Remove All</Button>
                  )}
                  <Button onClick={() => setOpenAlertModal(true)}>+ New Alert Rule</Button>
                </div>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="No Alert rules yet"
                    description="Create an Alert Rule to get started"
                    actionLabel="+ New Alert Rule"
                    onAction={() => setOpenAlertModal(true)}
                  />
                ) : (
                  <div className="space-y-4">
                    {alerts.map((a, i) => (
                      <Alert key={`${a.title}-${i}`} {...a} onRemove={() => removeAlert(i)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>System Notifications</CardTitle>
                  <CardDescription>Broadcasts and Incident Reports</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={openGenerateAlert} onOpenChange={setOpenGenerateAlert}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Generate Alert</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Admin Alert</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Message</p>
                          <Input
                            placeholder="Enter alert message..."
                            value={adminAlertMessage}
                            onChange={(e) => setAdminAlertMessage(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">This alert will be visible to all users and cannot be removed by them.</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleGenerateAlert}>Broadcast</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {notifications.length > 0 && (
                    <Button variant="destructive" onClick={deleteAllNotifications}>
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <EmptyState
                      icon={Bell}
                      title="No notifications"
                      description="System notifications will appear here"
                      actionLabel="Generate Alert"
                      onAction={() => setOpenGenerateAlert(true)}
                    />
                  ) : (
                    notifications.map((notification) => (
                      <AlertCard
                        key={notification.id}
                        title={getNotificationTitle(notification)}
                        description={notification.message}
                        severity={notification.severity || getSeverity(notification.type)}
                        time={notification.created_at ? formatTimestamp(notification.created_at) : "Just now"}
                        source={getNotificationSource(notification)}
                        statusMode="scale"
                        recovery={notification.recovery}
                        stage={notification.stage}
                        onRemove={() => deleteNotification(notification.id)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => userToDelete && performDeleteUser(userToDelete)}>
              {deletingUserId === null ? "Delete" : <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAlertModal} onOpenChange={setOpenAlertModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Alert Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm">Title</div>
              <Input value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)} placeholder="Alert title" />
            </div>
            <div className="space-y-1">
              <div className="text-sm">Description</div>
              <Textarea value={alertDescription} onChange={(e) => setAlertDescription(e.target.value)} placeholder="What happened?" />
            </div>
            <div className="space-y-1">
              <div className="text-sm">Severity</div>
              <div className="flex gap-2">
                {severityOptions.filter(s => s !== "any").map((s) => (
                  <Button
                    key={s}
                    variant={alertSeverity === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAlertSeverity(s as "critical" | "high" | "medium" | "low")}
                    className="capitalize"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm">Source</div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                value={alertSource}
                onChange={(e) => setAlertSource(e.target.value)}
              >
                <option value="" disabled>Select System or module</option>
                <option value="SIEM-Main-Server">SIEM-Main-Server</option>
                {deviceOptions.map((device) => (
                  <option key={device.id} value={device.name}>
                    {device.name} ({device.ip})
                  </option>
                ))}
              </select>
            </div>
            {alertError && <div className="text-xs text-destructive">{alertError}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpenAlertModal(false)}>Cancel</Button>
              <Button onClick={addAlert}>Add Alert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
