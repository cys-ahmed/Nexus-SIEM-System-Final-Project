import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemo, useState, useEffect } from "react";
import { syncManager } from "@/lib/syncManager";
import { formatTimestamp } from "@/lib/utils";
import { Breadcrumb } from "@/components/Breadcrumb";

interface Device {
  id: string;
  name: string;
  type: string;
  status: "Online" | "Offline" | "Warning";
  ip: string;
  lastSeen: string;
  lastPingMs?: number;
  lastChecked?: string;
}

interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  last_login?: string;
  current_state?: 'active' | 'inactive';
}
type ApiDevice = {
  Device_Id: number;
  Device_type: string;
  Device_Status?: string;
  Ip_Address: string;
  status?: string;
  Hostname?: string;
};

export default function Availability() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userStatus, setUserStatus] = useState<Record<number, 'active' | 'inactive'>>(syncManager.getState().userStatus);

  const [pingOpen, setPingOpen] = useState<boolean>(false);
  const [pingData, setPingData] = useState<{ name: string; ip: string; status: string; ms?: number; at?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((s) => setUserStatus(s.userStatus));

    fetch('/api/devices')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const mappedDevices: Device[] = data.devices.map((d: ApiDevice) => ({
            id: d.Device_Id,
            name: d.Hostname || d.Device_type,
            type: d.Device_type,
            status: (d.Device_Status || d.status) === 'active' ? 'Online' : 'Offline',
            ip: d.Ip_Address,
            lastSeen: "Just now"
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
          const statusMap: Record<number, 'active' | 'inactive'> = {};
          for (const u of data.users as Array<User>) {
            const state = (u.current_state === 'active') ? 'active' : 'inactive';
            statusMap[u.user_id] = state;
          }
          syncManager.setState((prev) => ({
            userStatus: { ...prev.userStatus, ...statusMap }
          }));
        }
      })
      .catch(err => console.error("Users fetch failed:", err));
    return () => unsubscribe();
  }, []);

  const deviceIndexByIp = useMemo(() => {
    const m = new Map<string, number>();
    devices.forEach((d, i) => m.set(d.ip, i));
    return m;
  }, [devices]);

  function getBadgeVariant(status: Device["status"]): "default" | "destructive" | "secondary" {
    if (status === "Online") return "default";
    if (status === "Offline") return "destructive";
    return "secondary";
  }

  async function ping(ip: string) {
    const start = performance.now();
    try {
      const res = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      const ok = !!data.ok;
      const ms = typeof data.ms === 'number' ? data.ms : Math.round(performance.now() - start);
      const idx = deviceIndexByIp.get(ip);
      if (idx === undefined) return;
      setDevices((prev) => {
        const next = [...prev];
        const now = new Date().toISOString();
        next[idx] = { ...next[idx], status: ok ? "Online" : "Offline", lastPingMs: ms, lastChecked: now };
        return next;
      });
      syncManager.setState((prev) => ({
        deviceStatus: { ...prev.deviceStatus, [ip]: ok ? 'Online' : 'Offline' }
      }));
      const d = devices[idx];
      return { name: d.name, ip, status: ok ? "Online" : "Offline", ms, at: new Date().toISOString() };
    } catch {
      const idx = deviceIndexByIp.get(ip);
      if (idx !== undefined) {
        setDevices((prev) => {
          const next = [...prev];
          const now = new Date().toISOString();
          next[idx] = { ...next[idx], status: "Offline", lastPingMs: undefined, lastChecked: now };
          return next;
        });
      }
      syncManager.setState((prev) => ({
        deviceStatus: { ...prev.deviceStatus, [ip]: 'Offline' }
      }));
      return { name: ip, ip, status: "Offline", ms: undefined, at: new Date().toISOString() };
    }
  }

  async function handleRowPing(ip: string) {
    setPingData({ name: ip, ip, status: "Pinging...", ms: undefined, at: undefined });
    setPingOpen(true);
    const res = await ping(ip);
    if (res) {
      setPingData(res);
    }
  }

  return (
    <div className="flex-1">
      <Header
        title="Availability"
        subtitle="Device status and quick checks"
        includeLogs={false}
        availabilityData={{
          devices: devices,
          users: users
        }}
      />
      <main className="p-8 space-y-6">
        <Breadcrumb items={[{ label: "Availability" }]} />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Devices Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Ping</TableHead>
                  <TableHead>Checked At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-xs">{d.ip}</TableCell>
                    <TableCell>{d.type}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(d.status)}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{typeof d.lastPingMs === "number" ? `${d.lastPingMs} ms` : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.lastChecked ? formatTimestamp(d.lastChecked) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button variant="default" size="sm" onClick={() => handleRowPing(d.ip)}>Ping</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>{u.user_id}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${userStatus[u.user_id] === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-muted-foreground">
                          {userStatus[u.user_id] === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </main>
      <Dialog open={pingOpen} onOpenChange={setPingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ping Result</DialogTitle>
            <DialogDescription>
              {pingData ? `${pingData.name} • ${pingData.ip}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Status</span>
              <span className="font-medium">{pingData?.status ?? ""}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Latency</span>
              <span className="font-medium">{typeof pingData?.ms === "number" ? `${pingData?.ms} ms` : "-"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Checked At</span>
              <span className="font-medium">{pingData?.at ?? ""}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
