import { IncidentFilters } from "@/components/IncidentFilters";
import Header from "@/components/Header";
import AlertCard from "@/components/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "@/hook/use-toast";
import { formatTimestamp } from "@/lib/utils";
import { severityOptions, typeOptions, irStages } from "@/lib/constants";
import { Incident, filterIncidents, fetchAllIncidents } from "@/lib/incidentUtils";

export default function UserIncidents() {
  const [activeIncidents, setActiveIncidents] = React.useState<Incident[]>([]);
  const [stageChecks, setStageChecks] = React.useState<Record<string, Set<string>>>(() => ({}));
  const [reviewNotes, setReviewNotes] = React.useState<Record<string, string>>({});

  
  const [severityFilter, setSeverityFilter] = React.useState<string>("any");
  const [typeFilter, setTypeFilter] = React.useState<string>("any");
  const [sourceFilter, setSourceFilter] = React.useState<string>("any");

  
  const [tempSeverityFilter, setTempSeverityFilter] = React.useState<string>("any");
  const [tempTypeFilter, setTempTypeFilter] = React.useState<string>("any");
  const [tempSourceFilter, setTempSourceFilter] = React.useState<string>("any");

  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async (pageNum = 0, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { incidents: newActiveIncidents, hasMore: moreAvailable } = await fetchAllIncidents(pageNum, 50, { onlyCriticalLogs: true });

      setHasMore(moreAvailable);

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

      newActiveIncidents.forEach(inc => {
        if (inc.stageChecks) {
          newStageChecks[inc.id] = new Set(inc.stageChecks);
        }
        if (inc.reviewNotes) {
          newReviewNotes[inc.id] = inc.reviewNotes;
        }
      });

      setStageChecks(prev => ({ ...prev, ...newStageChecks }));
      setReviewNotes(prev => ({ ...prev, ...newReviewNotes }));

    } catch (err: unknown) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData(0, false);
  }, [fetchData]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, true);
  };

  const resolveIncident = async (id: string) => {
    const incident = activeIncidents.find(i => i.id === id);
    if (!incident) return;

    if (id.startsWith('log-')) {
      try {
        await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: incident.title,
            description: incident.description,
            severity: incident.severity,
            source: incident.source,
            status: 'resolved',
            eventId: incident.id.replace('log-', '')
          })
        });

        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `User resolved log incident: ${incident.title}`,
            type: 'success'
          })
        });

        setActiveIncidents(prev => prev.filter(inc => inc.id !== id));
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
      return;
    }

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `User resolved incident: ${incident.title}`,
          type: 'success'
        })
      });

      const response = await fetch(`/api/detections/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });

      const data = await response.json();
      if (data.success) {
        const updated = activeIncidents.filter((inc) => inc.id !== id);
        setActiveIncidents(updated);
        toast({
          title: "Incident Resolved",
          description: "The incident has been moved to resolved incidents.",
        });
      }
    } catch (err) {
      console.error("Status update failed:", err);
      toast({
        title: "Error",
        description: "Failed to resolve incident.",
        variant: "destructive"
      });
    }
  };

  const filteredActiveIncidents = React.useMemo(() => {
    return filterIncidents(activeIncidents, {
      severity: severityFilter,
      type: typeFilter,
      source: sourceFilter
    });
  }, [activeIncidents, severityFilter, typeFilter, sourceFilter]);

  const sourceOptions = React.useMemo(() => {
    const sources = new Set(activeIncidents.map(i => i.source).filter(s => s && s !== "Unknown"));
    return ["any", ...Array.from(sources)];
  }, [activeIncidents]);

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

  const saveDetails = async (id: string, checks: string[], notes: string) => {
    if (id.startsWith('log-')) return;
    try {
      const res = await fetch(`/api/alerts/${id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageChecks: checks, reviewNotes: notes })
      });
      if (res.ok) {
        toast({
          title: "Saved",
          description: "Incident details saved.",
          duration: 2000
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error('Failed to save details:', error);
      toast({
        title: "Error",
        description: "Failed to save incident details.",
        variant: "destructive"
      });
    }
  };

  function toggleStage(id: string, stage: string, checked: boolean) {
    setStageChecks((prev) => {
      const next = { ...prev };
      const current = new Set(next[id] ?? new Set<string>());
      if (checked) current.add(stage);
      else current.delete(stage);
      next[id] = current;

      saveDetails(id, Array.from(current), reviewNotes[id] || "");

      return next;
    });
  }

  function navigateAdmin(incident: Incident) {
    const recovery = (stageChecks[incident.id]?.size ?? 0) * 25;

    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `User reported update on incident: ${incident.title}. Recovery: ${recovery}%`,
        type: 'info'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast({
            title: "Admin Notified",
            description: "The admin has been notified of your report.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to notify admin.",
            variant: "destructive"
          });
        }
      })
      .catch(err => {
        console.error("Failed to notify admin:", err);
        toast({
          title: "Error",
          description: "Failed to notify admin.",
          variant: "destructive"
        });
      });
  }

  function handleDone(incident: Incident) {
    resolveIncident(incident.id);
  }

  return (
    <div className="flex-1">
      <Header
        title="Security Incidents"
        subtitle="Manage and report active security incidents"
        incidents={activeIncidents}
        includeLogs={false}
      />
      <main className="p-8">

        <Card>
          <CardHeader>
            <CardTitle>Active Security Incidents ({filteredActiveIncidents.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/20 rounded-lg mb-4">
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
            </div>

            {isLoading && !loadingMore ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading incidents...</p>
              </div>
            ) : (
              <>
                {filteredActiveIncidents.map((incident) => (
                  <Dialog key={incident.id}>
                    <DialogTrigger asChild>
                      <div>
                        <AlertCard
                          {...incident}
                          time={formatTimestamp(incident.time)}
                          recovery={(stageChecks[incident.id]?.size ?? 0) * 25}
                          onRemove={() => resolveIncident(incident.id)}
                        />
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
                            <span>{(stageChecks[incident.id]?.size ?? 0) * 25}%</span>
                          </div>
                          <div className="h-2 w-full rounded bg-muted">
                            <div className="h-2 rounded bg-primary" style={{ width: `${(stageChecks[incident.id]?.size ?? 0) * 25}%` }} />
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
                            onBlur={() => saveDetails(incident.id, Array.from(stageChecks[incident.id] ?? []), reviewNotes[incident.id] || "")}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => navigateAdmin(incident)}>Report to Admin</Button>
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
                {hasMore && (
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
      </main>
    </div>
  );
}
