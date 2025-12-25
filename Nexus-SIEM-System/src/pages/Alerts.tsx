import { useState, useEffect } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Alert from "@/components/Alert";
import { formatTimestamp, getSeverityString } from "@/lib/utils";
import { severityOptions } from "@/lib/constants";

interface AlertItem {
  id?: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  source: string;
  status: "active" | "resolved";
  backendId?: number;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [source, setSource] = useState("");
  const [deviceOptions, setDeviceOptions] = useState<{ id: number; name: string; ip: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await fetch('/api/alerts');
        const data = await response.json();
        if (data.success && Array.isArray(data.alerts)) {
          // Map backend alerts to frontend AlertItem
          const mappedAlerts: AlertItem[] = data.alerts.map((a: any) => ({
            id: a.ALERT_ID ? a.ALERT_ID.toString() : (a.id ? a.id.toString() : Math.random().toString()),
            title: a.Title || a.title,
            description: a.Description || a.description,
            severity: getSeverityString(Number(a.Severity || a.severity)),
            time: formatTimestamp(a.Timestamp || a.created_at || new Date().toISOString()),
            source: a.Source || a.source,
            status: a.Status || a.status || 'active',
            backendId: a.ALERT_ID || a.id
          }));
          setAlerts(mappedAlerts);
        }
      } catch (e) {
        console.error("Failed to load alerts:", e);
      }
    };
    loadAlerts();

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
    fetchDevices();
  }, []);

  const handleCreateAlert = () => {
    setOpen(true);
  };

  async function addAlert() {
    if (!title.trim() || !description.trim() || !source.trim()) {
      setError("All fields are required");
      return;
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          source: source.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Alert synced to backend:', data);

        const res = await fetch('/api/alerts');
        const listData = await res.json();
        if (listData.success && Array.isArray(listData.alerts)) {
          const mappedAlerts: AlertItem[] = listData.alerts.map((a: any) => ({
            id: a.ALERT_ID ? a.ALERT_ID.toString() : (a.id ? a.id.toString() : Math.random().toString()),
            title: a.Title || a.title,
            description: a.Description || a.description,
            severity: getSeverityString(Number(a.Severity || a.severity)),
            time: formatTimestamp(a.Timestamp || a.created_at || new Date().toISOString()),
            source: a.Source || a.source,
            status: a.Status || a.status || 'active',
            backendId: a.ALERT_ID || a.id
          }));
          setAlerts(mappedAlerts);
        }

        setOpen(false);
        setTitle("");
        setDescription("");
        setSource("");
        setSeverity("medium");
        setError("");
      } else {
        setError(data.error || 'Failed to save alert to backend');
      }

    } catch (error) {
      console.error('Error creating alert:', error);
      setError('Failed to save alert');
    }
  }

  async function removeAlert(index: number) {
    try {
      const alertToRemove = alerts[index];
      const idToRemove = alertToRemove.backendId || alertToRemove.id;

      if (idToRemove) {
        await fetch(`/api/alerts/${idToRemove}`, {
          method: 'DELETE'
        });
      }

      const res = await fetch('/api/alerts');
      const listData = await res.json();
      if (listData.success && Array.isArray(listData.alerts)) {
        const mappedAlerts: AlertItem[] = listData.alerts.map((a: any) => ({
          id: a.ALERT_ID ? a.ALERT_ID.toString() : (a.id ? a.id.toString() : Math.random().toString()),
          title: a.Title || a.title,
          description: a.Description || a.description,
          severity: getSeverityString(Number(a.Severity || a.severity)),
          time: formatTimestamp(a.Timestamp || a.created_at || new Date().toISOString()),
          source: a.Source || a.source,
          status: a.Status || a.status || 'active',
          backendId: a.ALERT_ID || a.id
        }));
        setAlerts(mappedAlerts);
      }
    } catch (e) {
      console.error('Alert delete failed:', e);
    }
  }

  return (
    <div className="flex-1">
      <Header
        title="Alert Rules"
        subtitle="Create and manage alert rules for your resources"
        showReport={false}
      />
      <main className="p-8">
        {alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Alert rules yet."
            description="Create an Alert Rule to get started"
            actionLabel="+ New Alert Rule"
            onAction={handleCreateAlert}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreateAlert}>+ New Alert Rule</Button>
            </div>
            {alerts.map((a, i) => (
              <Alert key={`${a.title}-${i}`} {...a} onRemove={() => removeAlert(i)} />
            ))}
          </div>
        )}
      </main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Alert Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm">Title</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alert title" />
            </div>
            <div className="space-y-1">
              <div className="text-sm">Description</div>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" />
            </div>
            <div className="space-y-1">
              <div className="text-sm">Severity</div>
              <div className="flex gap-2">
                {severityOptions.filter(s => s !== "any").map((s) => (
                  <Button
                    key={s}
                    variant={severity === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSeverity(s as "critical" | "high" | "medium" | "low")}
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
                value={source}
                onChange={(e) => setSource(e.target.value)}
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
            {error && <div className="text-xs text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addAlert}>Add Alert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
