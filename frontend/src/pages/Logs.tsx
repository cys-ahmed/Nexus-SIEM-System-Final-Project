import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, FileText, Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLogsInfinite, useLogFilterOptions, LogEntry } from "@/hook/useLogs";
import { formatTimestamp } from "@/lib/utils";
import { Breadcrumb } from "@/components/Breadcrumb";

function getSeverityClass(severity: string): string {
  if (severity === "ERROR") {
    return "bg-red-500/10 text-red-500";
  }
  if (severity === "WARNING") {
    return "bg-orange-500/10 text-orange-500";
  }
  if (severity === "INFO") {
    return "bg-blue-500/10 text-blue-500";
  }

  return "bg-primary/10 text-primary";
}

function getDateTimeLabel(dateTime: string) {
  if (dateTime === "any") return "Any Time";
  if (dateTime === "realtime") return "Real-time";
  return dateTime;
}

function FilterBadges({ selection }: Readonly<{ selection: { ip: string; severity: string; source: string; logType: string; dateTime: string } }>) {
  return (
    <>
      <Badge variant="outline">{selection.ip === "any" ? "Any IP" : selection.ip}</Badge>
      <Badge variant="outline">{selection.severity === "any" ? "Any Severity" : selection.severity}</Badge>
      <Badge variant="outline">{selection.source === "any" ? "Any Source" : selection.source}</Badge>
      <Badge variant="outline">{selection.logType === "any" ? "Any Type" : selection.logType}</Badge>
      <Badge variant="outline">{getDateTimeLabel(selection.dateTime)}</Badge>
    </>
  );
}

function LogsList({
  loading,
  error,
  logs,
}: Readonly<{
  loading: boolean;
  error: Error | null;
  logs: LogEntry[];
}>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
        <p className="text-muted-foreground">Loading logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive">
          Error loading logs. Please make sure the backend server is running.
        </p>
      </div>
    );
  }

  if (logs.length > 0) {
    return (
      <>
        {logs.map((log, index) => (
          <div
            key={`${log.timestamp}-${log.message}-${index}`}
            className="p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(log.timestamp)}
              </span>
              <span
                className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${getSeverityClass(
                  log.severity
                )}`}
              >
                {log.severity}
              </span>
              <span className="flex-1 text-sm text-foreground">
                {log.message}
              </span>
              <span className="text-xs text-muted-foreground">
                {log.source} - {log.log_type ? `${log.log_type}` : ""}{log.ip ? ` - ${log.ip}` : ""}
              </span>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">
        No logs found. When we receive logs, they would show up here
      </p>
    </div>
  );
}

export default function Logs() {
  const [ip, setIp] = useState<string>("any");
  const [severity, setSeverity] = useState<string>("any");
  const [source, setSource] = useState<string>("any");
  const [logType, setLogType] = useState<string>("any");
  const [dateTime, setDateTime] = useState<string>("any");
  const [applied, setApplied] = useState<{
    ip: string;
    severity: string;
    source: string;
    logType: string;
    dateTime: string;
  } | null>(null);


  const {
    data: filterOptions,
    isLoading: optionsLoading,
  } = useLogFilterOptions();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: logsLoading,
    error: logsError,
  } = useLogsInfinite(applied);

  const logs = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  const ipOptions = useMemo(() => {
    if (!filterOptions) return ["any"];
    return ["any", ...(filterOptions.ips || [])];
  }, [filterOptions]);

  const sourceOptions = useMemo(() => {
    if (!filterOptions) return ["any"];
    return ["any", ...(filterOptions.sources || [])];
  }, [filterOptions]);

  const severityOptions = useMemo(() => {
    if (!filterOptions) return ["any"];
    return ["any", ...(filterOptions.severities || [])];
  }, [filterOptions]);

  const logTypeOptions = useMemo(() => {
    if (!filterOptions) return ["any"];
    return ["any", ...(filterOptions.logTypes || [])];
  }, [filterOptions]);



  const filtered = logs;
  const latestTimestamp = useMemo(() => {
    if (!filtered || filtered.length === 0) return null;
    let maxTs = filtered[0].timestamp;
    for (let i = 1; i < filtered.length; i++) {
      const cur = filtered[i].timestamp;
      if (new Date(cur).getTime() > new Date(maxTs).getTime()) {
        maxTs = cur;
      }
    }
    return maxTs;
  }, [filtered]);

  return (
    <div className="flex-1">
      <Header
        title="Security Logs"
        subtitle="View and analyze security event logs"
        logs={filtered}
      />
      <main className="p-8 space-y-6">
        <Breadcrumb items={[{ label: "Security Logs" }]} />
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <div className="md:col-span-1">
                <Select.Root value={ip} onValueChange={setIp} disabled={optionsLoading}>
                  <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                    <Select.Value placeholder="IP" />
                    <ChevronDown className="h-4 w-4" />
                  </Select.Trigger>
                  <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Selected: {ip === "any" ? "Any IP" : ip}
                    </div>
                    {ipOptions.map((opt) => (
                      <Select.Item
                        key={opt}
                        value={opt}
                        className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                      >
                        <Select.ItemText>
                          {opt === "any" ? "Any IP" : opt}
                        </Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="h-4 w-4" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className="md:col-span-1">
                <Select.Root
                  value={severity}
                  onValueChange={setSeverity}
                  disabled={optionsLoading}
                >
                  <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                    <Select.Value placeholder="Severity" />
                    <ChevronDown className="h-4 w-4" />
                  </Select.Trigger>
                  <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Selected: {severity === "any" ? "Any Severity" : severity}
                    </div>
                    {severityOptions.map((opt) => (
                      <Select.Item
                        key={opt}
                        value={opt}
                        className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                      >
                        <Select.ItemText>
                          {opt === "any" ? "Any Severity" : opt}
                        </Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="h-4 w-4" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className="md:col-span-1">
                <Select.Root value={source} onValueChange={setSource} disabled={optionsLoading}>
                  <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                    <Select.Value placeholder="Source" />
                    <ChevronDown className="h-4 w-4" />
                  </Select.Trigger>
                  <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Selected: {source === "any" ? "Any Source" : source}
                    </div>
                    {sourceOptions.map((opt) => (
                      <Select.Item
                        key={opt}
                        value={opt}
                        className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                      >
                        <Select.ItemText>
                          {opt === "any" ? "Any Source" : opt}
                        </Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="h-4 w-4" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className="md:col-span-1">
                <Select.Root value={logType} onValueChange={setLogType} disabled={optionsLoading}>
                  <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                    <Select.Value placeholder="Log Type" />
                    <ChevronDown className="h-4 w-4" />
                  </Select.Trigger>
                  <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Selected: {logType === "any" ? "Any Type" : logType}
                    </div>
                    {logTypeOptions.map((opt) => (
                      <Select.Item
                        key={opt}
                        value={opt}
                        className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                      >
                        <Select.ItemText>
                          {opt === "any" ? "Any Type" : opt}
                        </Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="h-4 w-4" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className="md:col-span-1">
                <Select.Root
                  value={dateTime}
                  onValueChange={setDateTime}
                  disabled={optionsLoading}
                >
                  <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                    <Select.Value placeholder="Date/Time" />
                    <ChevronDown className="h-4 w-4" />
                  </Select.Trigger>
                  <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Selected: {getDateTimeLabel(dateTime)}
                    </div>
                    {(["any", "realtime", "5m", "30m", "1h"] as const).map((opt) => (
                      <Select.Item
                        key={opt}
                        value={opt}
                        className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                      >
                        <Select.ItemText>
                          {getDateTimeLabel(opt)}
                        </Select.ItemText>
                        <Select.ItemIndicator>
                          <Check className="h-4 w-4" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              <div className="md:col-span-1 flex items-center">
                <Button
                  className="w-full"
                  onClick={() => setApplied({ ip, severity, source, logType, dateTime })}
                  disabled={logsLoading}
                >
                  {logsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Filter"
                  )}
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Selected:</span>
              <FilterBadges selection={applied ?? { ip, severity, source, logType, dateTime }} />
              <Badge variant="outline" className="ml-2">
                {filtered.length} logs
              </Badge>
            </div>
            {latestTimestamp && (
              <div className="mt-2 text-xs text-muted-foreground">
                <span>Latest:</span>{" "}
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(latestTimestamp)}
                </span>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button className="w-full"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIp("any");
                  setSeverity("any");
                  setSource("any");
                  setLogType("any");
                  setDateTime("any");
                  setApplied({
                    ip: "any",
                    severity: "any",
                    source: "any",
                    logType: "any",
                    dateTime: "any",
                  });
                }}
                disabled={logsLoading}
              >
                Reset (Any)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <LogsList loading={logsLoading} error={logsError} logs={filtered} />
            </div>
          </CardContent>
        </Card>

        {hasNextPage && !logsLoading && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
