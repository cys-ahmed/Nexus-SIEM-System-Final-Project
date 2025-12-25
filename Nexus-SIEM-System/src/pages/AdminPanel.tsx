import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Select from "@radix-ui/react-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Trash2, ChevronDown } from "lucide-react";
import Alerts from "@/pages/Alerts";
import * as React from "react";
import { toast } from "@/hook/use-toast";
import { useLocation, Link } from "react-router-dom";
import AlertCard from "@/components/AlertCard";
import { getAuthHeaders, logout } from "@/lib/auth";
import { useAuth } from "@/hook/useAuth";
import { formatTimestamp } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function AdminPanel() {
  const location = useLocation();
  const { user: currentUser } = useAuth();
  type AdminReportState = {
    incident: { id: string; title: string; description: string; severity: "critical" | "high" | "medium" | "low"; time: string; source: string };
    recovery?: number;
    stages?: string[];
    notes?: string;
  };
  const [latestReport, setLatestReport] = React.useState<
    | {
      incident: { id: string; title: string; description: string; severity: "critical" | "high" | "medium" | "low"; time: string; source: string };
      recovery: number;
      stages: string[];
      notes?: string;
    }
    | null
  >(null);

  type Notification = {
    id: number;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  };
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error: unknown) {
      console.error("Notifications fetch failed:", error);
    }
  }, []);

  const deleteNotification = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({
          title: "Notification Removed",
          description: "The notification has been removed.",
        });
      }
    } catch (error: unknown) {
      console.error("Notification delete failed:", error);
      toast({
        title: "Error",
        description: "Failed to remove notification.",
        variant: "destructive"
      });
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setNotifications([]);
        toast({
          title: "All Notifications Removed",
          description: "All notifications have been removed.",
        });
      }
    } catch (error: unknown) {
      console.error("Failed to delete notifications:", error);
      toast({
        title: "Error",
        description: "Failed to remove notifications.",
        variant: "destructive"
      });
    }
  };

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => {
    const s = location.state as unknown as AdminReportState | null;
    if (s?.incident) {
      setLatestReport({ incident: s.incident, recovery: s.recovery ?? 0, stages: s.stages ?? [], notes: s.notes });
      toast({
        title: "Admin Report Received",
        description: `${s.incident.title} • Recovery ${s.recovery ?? 0}% • Stages ${s.stages?.length ?? 0}`,
      });
    }
  }, [location.state]);

  async function addAlertFromReport() {
    if (!latestReport) return;

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: latestReport.incident.title,
          description: latestReport.incident.description,
          severity: latestReport.incident.severity,
          source: latestReport.incident.source
        })
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: "Alert added", description: latestReport.incident.title });

        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `New Alert: ${latestReport.incident.title}`,
              type: 'admin_alert'
            })
          });
          fetchNotifications();
        } catch (error_) {
          console.error("Failed to create notification:", error_);
        }

      } else {
        throw new Error("Failed to add alert");
      }
    } catch (error: unknown) {
      console.error('Error adding alert:', error);
      toast({ title: "Error", description: "Could not save alert to backend.", variant: "destructive" });
    }
  }

  async function markResolvedFromReport() {
    if (!latestReport) return;

    try {
      const response = await fetch(`/api/alerts/${latestReport.incident.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      const data = await response.json();

      if (data.success) {
        toast({ title: "Incident marked resolved", description: latestReport.incident.title });
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error: unknown) {
      console.error('Error marking incident resolved:', error);
      toast({ title: "Error", description: "Could not resolve incident.", variant: "destructive" });
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

  const [openAddUser, setOpenAddUser] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState("Analyst");
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  const [openGenerateAlert, setOpenGenerateAlert] = React.useState(false);
  const [adminAlertMessage, setAdminAlertMessage] = React.useState("");

  async function handleGenerateAlert() {
    if (!adminAlertMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an alert message.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: adminAlertMessage,
          type: 'admin_alert'
        })
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Alert Generated",
          description: "The alert has been broadcast to all users.",
        });
        setOpenGenerateAlert(false);
        setAdminAlertMessage("");
        fetchNotifications();
      }
    } catch (error: unknown) {
      console.error("Alert generation failed:", error);
      toast({
        title: "Error",
        description: "Failed to generate alert.",
        variant: "destructive"
      });
    }
  }

  const fetchRoles = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/roles`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        if (data.roles?.length > 0 && !newUserRole) {
          setNewUserRole(data.roles[0].role_name);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching roles:', error);
      if (!newUserRole) {
        setNewUserRole("Analyst");
      }
    }
  }, [newUserRole]);


  React.useEffect(() => {
    if (openAddUser) {
      fetchRoles();
    }

  }, [openAddUser, fetchRoles]);

  async function handleAddUser() {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserRole) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: newUserName.trim(),
          email: newUserEmail.trim(),
          role_name: newUserRole,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {

        const text = await response.text();
        throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
      }

      if (response.ok && data.success) {
        toast({
          title: "User Added Successfully",
          description: `${data.user.username} (${data.user.email}) • Role: ${data.user.role} • Default Password: NewUser`,
        });
        setOpenAddUser(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserRole("");
      } else {
        const errorMsg = data?.error || `Server error: ${response.status} ${response.statusText}`;
        toast({
          title: "Error Adding User",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('Error adding user:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to server. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const [openDeleteUser, setOpenDeleteUser] = React.useState(false);
  const [users, setUsers] = React.useState<Array<{ user_id: number; username: string; email: string; role_name: string }>>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [deletingUserId, setDeletingUserId] = React.useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<number | null>(null);

  async function fetchUsers() {
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
  }

  React.useEffect(() => {
    if (openDeleteUser) {
      fetchUsers();
    }
  }, [openDeleteUser]);

  function handleDeleteUser(userId: number) {
    setConfirmDeleteId(userId);
  }

  async function performDeleteUser() {
    if (!confirmDeleteId) return;
    const userId = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingUserId(userId);

    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "User Deleted",
          description: "User has been removed successfully.",
        });
        setUsers(users.filter(u => u.user_id !== userId));

        if (currentUser?.user_id === userId) {
          logout();
          globalThis.location.href = "/login";
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('User delete failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  }

  const getSeverity = (type: string) => {
    if (type === 'error' || type === 'admin_alert') return 'critical';
    if (type === 'warning') return 'high';
    return 'low';
  };

  return (
    <div className="flex-1">
      <Header title="Admin Panel" subtitle="SIEM System administrator details and privileges" />
      <main className="p-8 space-y-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Admin Panel</CardTitle>
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
                  <span className="text-sm text-muted-foreground">Access Level</span>
                  <span className="text-sm font-medium text-foreground">{profile.accessLevel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">2FA Enabled</span>
                  <span className="text-sm font-medium text-foreground">{profile.twoFAEnabled ? "Yes" : "No"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Login</span>
                  <span className="text-sm font-medium text-foreground">{profile.lastLogin}</span>
                </div>
                <div className="pt-4 flex gap-2">
                  <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
                    <DialogTrigger asChild>
                      <Button variant="outline">+ Add User</Button>
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
                            disabled={isSubmitting}
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
                            <Select.Content
                              position="popper"
                              className="max-h-[200px] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                            >
                              {["Admin", "Analyst"].map((role) => (
                                <Select.Item
                                  key={role}
                                  value={role}
                                  className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                                >
                                  <Select.ItemText>{role}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-xs font-medium text-foreground mb-1">Default Password</p>
                          <p className="text-xs text-muted-foreground">NewUser</p>
                          <p className="text-xs text-muted-foreground mt-1">The user will be created with this default password.</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpenAddUser(false)} disabled={isSubmitting}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddUser} disabled={isSubmitting || !newUserName.trim() || !newUserEmail.trim() || !newUserRole}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create User'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this user? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={performDeleteUser}>Delete</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={openDeleteUser} onOpenChange={setOpenDeleteUser}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete User</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {(() => {
                          if (loadingUsers) {
                            return (
                              <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            );
                          }
                          if (users.length === 0) {
                            return <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>;
                          }
                          return (
                            <div className="space-y-2">
                              {users.map(user => (
                                <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                                  <div>
                                    <p className="text-sm font-medium">{user.username}</p>
                                    <p className="text-xs text-muted-foreground">{user.email} • {user.role_name}</p>
                                  </div>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={deletingUserId === user.user_id || user.user_id === currentUser?.user_id}
                                    onClick={() => handleDeleteUser(user.user_id)}
                                  >
                                    {deletingUserId === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpenDeleteUser(false)}>Close</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Link to="/admin/reset-password" className="ml-auto">
                    <Button variant="destructive">
                      Reset Password
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>SIEM Admin Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Managed Areas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.managedAreas.map((a) => (
                      <Badge key={a} variant="outline">{a}</Badge>
                    ))}
                  </div>
                </div>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Alerts Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Alerts />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Notifications & IR Status</CardTitle>
              <div className="flex gap-2">
                <Dialog open={openGenerateAlert} onOpenChange={setOpenGenerateAlert}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Generate Alert</Button>
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
                  <Button variant="destructive" size="sm" onClick={deleteAllNotifications}>
                    Remove All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-secondary/50 p-4 space-y-6">
                {latestReport && (
                  <div>
                    <p className="text-sm font-medium text-foreground">Latest Incident Report</p>
                    <div className="mt-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <div>
                            <AlertCard {...latestReport.incident} time={formatTimestamp(latestReport.incident.time)} recovery={latestReport.recovery} />
                          </div>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{latestReport.incident.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">{latestReport.incident.description}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Incident Recovery</span>
                                <span>{latestReport.recovery}%</span>
                              </div>
                              <div className="h-2 w-full rounded bg-muted">
                                <div className="h-2 rounded bg-primary" style={{ width: `${latestReport.recovery}%` }} />
                              </div>
                            </div>
                            {latestReport.stages.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Stages</p>
                                <div className="flex flex-wrap gap-2">
                                  {latestReport.stages.map((st) => (
                                    <Badge key={st} variant="outline">{st}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {latestReport.notes && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Stage Review</p>
                                <p className="text-sm text-foreground">{latestReport.notes}</p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button onClick={addAlertFromReport}>Add Alert</Button>
                            <DialogClose asChild>
                              <Button variant="secondary" onClick={markResolvedFromReport}>Done</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Stages</p>
                      <div className="flex flex-wrap gap-2">
                        {latestReport.stages.map((st) => (
                          <Badge key={st} variant="outline">{st}</Badge>
                        ))}
                      </div>
                    </div>
                    {latestReport.notes && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">Stage Review</p>
                        <p className="text-sm text-foreground">{latestReport.notes}</p>
                      </div>
                    )}
                    <div className="my-6 border-b border-border/50" />
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-foreground mb-4">Notifications</p>
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <AlertCard
                        key={notification.id}
                        title={notification.type === 'admin_alert' ? "Admin Alert" : "System Notification"}
                        description={notification.message}
                        severity={getSeverity(notification.type)}
                        time={notification.created_at ? formatTimestamp(notification.created_at) : "Just now"}
                        source={notification.type === 'admin_alert' ? "Admin" : "System"}
                        statusMode="hidden"
                        onRemove={() => deleteNotification(notification.id)}
                      />
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No new notifications</p>
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
