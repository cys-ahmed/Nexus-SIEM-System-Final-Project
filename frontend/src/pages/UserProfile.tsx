import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hook/useAuth";
import { useNavigate } from "react-router-dom";
import { formatTimestamp } from "@/lib/utils";

export default function UserProfile() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const profile = {
    workspaceName: "SIEM System Workspace",
    name: currentUser?.username || "Analyst",
    email: currentUser?.email || "analyst@example.com",
    id: currentUser?.user_id ? `USR-${currentUser.user_id.toString().padStart(3, '0')}` : "ANL-000",
    role: currentUser?.role || "SIEM System Analyst",
    avatarUrl: "/user_pic.png",
    accessLevel: currentUser?.role === 'Admin' ? "Full Access" : "Limited",
    twoFAEnabled: true,
    lastLogin: formatTimestamp(currentUser?.last_login || new Date().toISOString()),
    managedAreas: ["Dashboard", "Logs"],
  };

  return (
    <div className="flex-1">
      <Header title="User Profile" subtitle="SIEM System user profile" />
      <main className="p-8 space-y-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                  <AvatarFallback>{profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-foreground">{profile.name}</h3>
                    <Badge variant="secondary">{profile.role}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.workspaceName}</p>
                  <p className="text-xs text-muted-foreground mt-1">ID: {profile.id}</p>
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
                <div className="pt-4">
                  <Button variant="destructive" className="w-full" onClick={() => navigate('/user/reset-password')}>
                    Reset Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>SIEM User Info</CardTitle>
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
                      <li>View logs and investigate anomalies</li>
                      <li>View dashboard and logs</li>
                      <li>Generate reports</li>
                    </ul>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-4">
                    <p className="text-sm font-medium text-foreground">Privileges</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      <li>Full access to logs, dashboard</li>
                      <li>Generate reports</li>
                    </ul>
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
