import Header from "@/components/Header";
import AlertCard from "@/components/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import * as React from "react";
import { toast } from "@/hook/use-toast";
import { Loader2 } from "lucide-react";
import { formatTimestamp, getSeverityString, mapLogSeverity } from "@/lib/utils";
import { Breadcrumb } from "@/components/Breadcrumb";
import { severityOptions, typeOptions, irStages } from "@/lib/constants";
import { useNavigate } from "react-router-dom";

const saveResolvedLog = (log: any) => {
};

type Incident = {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  source: string;
  stageChecks?: string[];
  reviewNotes?: string;
};

import { IncidentFilters } from "@/components/IncidentFilters";

export default function AdminIncidents() {
  const navigate = useNavigate();
  const [activeIncidents, setActiveIncidents] = React.useState<Incident[]>([]);
  const [incidentRecovery, setIncidentRecovery] = React.useState<Record<string, number>>({});
  const [stageChecks, setStageChecks] = React.useState<Record<string, Set<string>>>(() => ({}));
  const [reviewNotes, setReviewNotes] = React.useState<Record<string, string>>({});

  const [severityFilter, setSeverityFilter] = React.useState<string>("any");
  const [typeFilter, setTypeFilter] = React.useState<string>("any");
  const [sourceFilter, setSourceFilter] = React.useState<string>("any");

  const [tempSeverityFilter, setTempSeverityFilter] = React.useState<string>("any");
  const [tempTypeFilter, setTempTypeFilter] = React.useState<string>("any");
  const [tempSourceFilter, setTempSourceFilter] = React.useState<string>("any");

  const [isFiltering, setIsFiltering] = React.useState(false);

  const applyFilters = () => {
    setSeverityFilter(tempSeverityFilter);
    setTypeFilter(tempTypeFilter);
    setSourceFilter(tempSourceFilter);
  };

  const resetFilters = () => {
    setTempSeverityFilter("any");
    setTempTypeFilter("any");
    setTempSourceFilter("any");
    setSeverityFilter("any");
    setTypeFilter("any");
    setSourceFilter("any");
  };

  const processLogs = (logs: { id: number; message: string; severity: string; timestamp: string; source: string }[], type: string) => {
    return logs.map((log) => ({
      id: `log-${log.id}`,
      title: `${type} Log`,
      description: log.message,
      severity: mapLogSeverity(log.severity),
      time: log.timestamp,
      source: log.source || "Unknown"
    }));
  };

  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const fetchIncidents = React.useCallback(async (pageNum = 0, isLoadMore = false) => {
    if (!isLoadMore) {
      setIsFiltering(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const limit = 50;
      const offset = pageNum * limit;

      const [activeRes, resolvedRes, authLogsRes, sysLogsRes] = await Promise.all([
        fetch(`/api/alerts?status=active&limit=${limit}&offset=${offset}`),
        fetch(`/api/resolved-incidents?limit=1000`),
        fetch(`/api/logs?logType=authentication&limit=${limit}&offset=${offset}`),
        fetch(`/api/logs?logType=system&limit=${limit}&offset=${offset}`)
      ]);

      const activeData = await activeRes.json();
      const resolvedData = await resolvedRes.json();
      const authLogsData = await authLogsRes.json();
      const sysLogsData = await sysLogsRes.json();

      const resolvedKeys = new Set<string>();
      if (resolvedData.success && Array.isArray(resolvedData.incidents)) {
        resolvedData.incidents.forEach((a: any) => {
          if (Array.isArray(a.Event_Ids)) {
            a.Event_Ids.forEach((eid: any) => {
              resolvedKeys.add(`${eid}-${a.Rule_Name}`);
            });
          }
        });
      }

      let newActiveIncidents: Incident[] = [];

      if (activeData.success) {
        const mapped = activeData.alerts.map((a: { ALERT_ID: number; Title: string; Description: string; Severity: number; Timestamp: string; Source: string; Stage_Checks?: any; Review_Notes?: string }) => ({
          id: a.ALERT_ID.toString(),
          title: a.Title || "Untitled Incident",
          description: a.Description || "No description provided",
          severity: getSeverityString(a.Severity),
          time: a.Timestamp,
          source: a.Source || "Unknown",
          stageChecks: Array.isArray(a.Stage_Checks) ? a.Stage_Checks : [],
          reviewNotes: a.Review_Notes || ""
        }));
        const criticalOrHigh = mapped.filter((i: Incident) => i.severity === "critical" || i.severity === "high");
        newActiveIncidents = [...newActiveIncidents, ...criticalOrHigh];
      }

      const filterLogs = (logs: any[], type: string) => {
        const processed = processLogs(logs, type);
        return processed.filter(l =>
          !resolvedKeys.has(`${l.id.replace('log-', '')}-${l.title}`)
        );
      };

      if (authLogsData.success) {
        newActiveIncidents = [...newActiveIncidents, ...filterLogs(authLogsData.logs, "Authentication")];
      }
      if (sysLogsData.success) {
        newActiveIncidents = [...newActiveIncidents, ...filterLogs(sysLogsData.logs, "System")];
      }

      const activeCount = activeData.alerts?.length || 0;
      const authCount = authLogsData.logs?.length || 0;
      const sysCount = sysLogsData.logs?.length || 0;

      if (activeCount === 0 && authCount === 0 && sysCount === 0) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (isLoadMore) {
        setActiveIncidents(prev => {
          const combined = [...prev, ...newActiveIncidents];
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
      } else {
        setActiveIncidents(Array.from(new Map(newActiveIncidents.map(item => [item.id, item])).values()));
      }

      const newStageChecks: Record<string, Set<string>> = {};
      const newReviewNotes: Record<string, string> = {};
      const newRecovery: Record<string, number> = {};

      newActiveIncidents.forEach(inc => {
        if (inc.stageChecks) {
          newStageChecks[inc.id] = new Set(inc.stageChecks);
          newRecovery[inc.id] = Math.min(100, inc.stageChecks.length * 25);
        }
        if (inc.reviewNotes) {
          newReviewNotes[inc.id] = inc.reviewNotes;
        }
      });

      setStageChecks(prev => ({ ...prev, ...newStageChecks }));
      setReviewNotes(prev => ({ ...prev, ...newReviewNotes }));
      setIncidentRecovery(prev => ({ ...prev, ...newRecovery }));

    } catch (err) {
      console.error("Fetch incidents failed:", err);
    } finally {
      setIsFiltering(false);
      setLoadingMore(false);
    }
  }, []);

  React.useEffect(() => {
    fetchIncidents(0, false);
  }, [fetchIncidents]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchIncidents(nextPage, true);
  };


  const saveDetails = async (id: string, checks: string[], notes: string) => {
    if (id.startsWith('log-')) return;
    try {
      await fetch(`/api/alerts/${id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageChecks: checks, reviewNotes: notes })
      });
    } catch (error) {
      console.error('Failed to save details:', error);
    }
  };

  const handleLogIncidentRemoval = async (id: string) => {
    const moved = activeIncidents.find(inc => inc.id === id);

    if (moved) {
      try {
        await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: moved.title,
            description: moved.description,
            severity: moved.severity,
            source: moved.source,
            status: 'resolved',
            eventId: moved.id.replace('log-', '')
          })
        });

        setActiveIncidents(prev => prev.filter(inc => inc.id !== id));
        saveResolvedLog(moved);

        toast({
          title: "Log Incident Resolved",
          description: "The log incident has been moved to resolved incidents.",
        });
      } catch (err) {
        console.error("Failed to resolve log incident:", err);
        toast({
          title: "Error",
          description: "Failed to resolve log incident.",
          variant: "destructive"
        });
      }
    }
  };

  const handleAlertIncidentRemoval = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });

      const data = await response.json();

      if (data.success) {
        const moved = activeIncidents.find(inc => inc.id === id);
        if (moved) {
          setActiveIncidents(prev => prev.filter(inc => inc.id !== id));

          if (moved.severity === 'critical' || moved.severity === 'high') {
            try {
              console.log("IndexedDB alert removed:", moved.title);
            } catch (alertError) {
              console.error('IndexedDB delete failed:', alertError);
            }
          }
        }
        toast({
          title: "Incident Resolved",
          description: "The incident has been moved to resolved incidents.",
        });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast({
        title: "Error",
        description: "Failed to resolve incident.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveActive = async (id: string) => {
    if (id.startsWith('log-')) {
      handleLogIncidentRemoval(id);
      return;
    }

    await handleAlertIncidentRemoval(id);
  };

  function toggleStage(incidentId: string, stage: string, checked: boolean) {
    const id = incidentId;

    const currentChecks = new Set(stageChecks[id] || []);
    if (checked) currentChecks.add(stage);
    else currentChecks.delete(stage);

    const newChecksArray = Array.from(currentChecks);

    setStageChecks(prev => ({
      ...prev,
      [id]: currentChecks
    }));

    const newSize = currentChecks.size;
    setIncidentRecovery(prev => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, newSize * 25))
    }));

    saveDetails(id, newChecksArray, reviewNotes[id] || "");
  }

  function handleGenerateAlert(incident: Incident) {
    const stages = Array.from(stageChecks[incident.id] ?? new Set<string>());
    const recovery = incidentRecovery[incident.id] ?? 0;
    const notes = reviewNotes[incident.id];

    navigate("/AdminPanel", {
      state: {
        incident,
        recovery,
        stages,
        notes
      }
    });
  }

  function handleDone(incident: Incident) {
    handleRemoveActive(incident.id);
  }

  const filteredActiveIncidents = React.useMemo(() => {
    return activeIncidents.filter(incident => {
      const matchSeverity = severityFilter === "any" || incident.severity === severityFilter;

      let incidentType = "alert";
      if (incident.id.startsWith("log-")) {
        if (incident.title.includes("Authentication")) incidentType = "authentication";
        else if (incident.title.includes("System")) incidentType = "system";
      }

      const matchType = typeFilter === "any" || incidentType === typeFilter;
      const matchSource = sourceFilter === "any" || incident.source === sourceFilter;

      return matchSeverity && matchType && matchSource;
    });
  }, [activeIncidents, severityFilter, typeFilter, sourceFilter]);

  const sourceOptions = React.useMemo(() => {
    const sources = new Set(activeIncidents.map(i => i.source).filter(s => s && s !== "Unknown"));
    return ["any", ...Array.from(sources)];
  }, [activeIncidents]);

  return (
    <div className="flex-1">
      <Header
        title="Active Security Incidents"
        subtitle="Monitor and manage active security incidents"
        incidents={activeIncidents}
        includeLogs={false}
      />
      <main className="p-8">
        <div className="flex flex-col gap-6 mb-6">
          <Breadcrumb items={[{ label: "Active Incidents" }]} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <IncidentFilters
                tempSeverity={tempSeverityFilter}
                setTempSeverity={setTempSeverityFilter}
                tempType={tempTypeFilter}
                setTempType={setTempTypeFilter}
                tempSource={tempSourceFilter}
                setTempSource={setTempSourceFilter}
                severityOptions={severityOptions}
                typeOptions={typeOptions}
                sourceOptions={sourceOptions}
                onApply={applyFilters}
                onReset={resetFilters}
                activeSeverity={severityFilter}
                activeType={typeFilter}
                activeSource={sourceFilter}
                count={filteredActiveIncidents.length}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Security Incidents ({filteredActiveIncidents.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isFiltering ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading incidents...</p>
                </div>
              ) : (
                <>
                  {filteredActiveIncidents.map((incident, index) => (
                    <Dialog key={incident.id}>
                      <DialogTrigger asChild>
                        <div>
                          <AlertCard {...incident} time={formatTimestamp(incident.time)} recovery={incidentRecovery[incident.id] ?? 0} onRemove={() => handleRemoveActive(incident.id)} />
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{incident.title}</DialogTitle>
                          <DialogDescription>
                            {incident.description}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Incident Recovery</span>
                              <span>{incidentRecovery[incident.id] ?? 0}%</span>
                            </div>
                            <div className="h-2 w-full rounded bg-muted">
                              <div className="h-2 rounded bg-primary" style={{ width: `${incidentRecovery[incident.id] ?? 0}%` }} />
                            </div>
                          </div>
                          <div className="space-y-3">
                            {irStages.map((stage) => {
                              const checked = stageChecks[incident.id]?.has(stage) ?? false;
                              return (
                                <div key={stage} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => toggleStage(incident.id, stage, !!v)}
                                  />
                                  <span className="text-sm">{stage}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Stage Review</div>
                            <Textarea
                              placeholder="Add review notes..."
                              value={reviewNotes[incident.id] ?? ""}
                              onChange={(e) => setReviewNotes((prev) => ({ ...prev, [incident.id]: e.target.value }))}
                              onBlur={() => saveDetails(incident.id, Array.from(stageChecks[incident.id] || []), reviewNotes[incident.id] || "")}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => handleGenerateAlert(incident)}>Generate Alert</Button>
                          {(stageChecks[incident.id]?.size ?? 0) === irStages.length && (
                            <Button variant="secondary" onClick={() => handleDone(incident)}>Done</Button>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ))}
                  {filteredActiveIncidents.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No active incidents found matching the filters.
                    </div>
                  )}
                  {hasMore && !isFiltering && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
