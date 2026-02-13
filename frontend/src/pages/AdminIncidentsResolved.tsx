import Header from "@/components/Header";
import AlertCard from "@/components/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { toast } from "@/hook/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import { Breadcrumb } from "@/components/Breadcrumb";
import { IncidentFilters } from "@/components/IncidentFilters";
import { severityOptions, typeOptions } from "@/lib/constants";
import { Incident, filterIncidents, mapResolvedToIncident } from "@/lib/incidentUtils";

export default function AdminIncidentsResolved() {

  const [resolvedIncidents, setResolvedIncidents] = React.useState<Incident[]>([]);

  const [resolvedSeverityFilter, setResolvedSeverityFilter] = React.useState<string>("any");
  const [resolvedTypeFilter, setResolvedTypeFilter] = React.useState<string>("any");
  const [resolvedSourceFilter, setResolvedSourceFilter] = React.useState<string>("any");

  const [tempResolvedSeverityFilter, setTempResolvedSeverityFilter] = React.useState<string>("any");
  const [tempResolvedTypeFilter, setTempResolvedTypeFilter] = React.useState<string>("any");
  const [tempResolvedSourceFilter, setTempResolvedSourceFilter] = React.useState<string>("any");

  const [isFiltering, setIsFiltering] = React.useState(false);

  const applyResolvedFilters = () => {
    setResolvedSeverityFilter(tempResolvedSeverityFilter);
    setResolvedTypeFilter(tempResolvedTypeFilter);
    setResolvedSourceFilter(tempResolvedSourceFilter);
  };

  const resetResolvedFilters = () => {
    setTempResolvedSeverityFilter("any");
    setTempResolvedTypeFilter("any");
    setTempResolvedSourceFilter("any");
    setResolvedSeverityFilter("any");
    setResolvedTypeFilter("any");
    setResolvedSourceFilter("any");
  };

  const fetchIncidents = React.useCallback(async () => {
    setIsFiltering(true);
    try {
      const resolvedRes = await fetch('/api/resolved-incidents');

      const resolvedData = await resolvedRes.json();

      let resolvedMapped: Incident[] = [];
      if (resolvedData.success) {
        resolvedMapped = resolvedData.incidents.map(mapResolvedToIncident);
      }

      const uniqueResolved = Array.from(new Map(resolvedMapped.map(item => [item.id, item])).values());

      setResolvedIncidents(uniqueResolved);

    } catch (err) {
      console.error("Fetch incidents failed:", err);
    } finally {
      setIsFiltering(false);
    }
  }, []);

  React.useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleRemoveResolved = async (id: string) => {
    try {
      const response = await fetch(`/api/resolved-incidents/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        setResolvedIncidents(prev => prev.filter(inc => inc.id !== id));
        toast({
          title: "Incident Removed",
          description: "Permanently deleted from database."
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete incident.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Failed to delete incident:", err);
      toast({
        title: "Error",
        description: "Failed to delete incident.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAllResolved = async () => {
    if (!globalThis.confirm("Are you sure you want to delete ALL resolved incidents? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch('/api/resolved-incidents', {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        setResolvedIncidents([]);
        toast({
          title: "All Incidents Removed",
          description: `Successfully deleted ${data.count} incidents.`
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete all incidents.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Failed to delete all incidents:", err);
      toast({
        title: "Error",
        description: "Failed to delete all incidents.",
        variant: "destructive"
      });
    }
  };

  const filteredResolvedIncidents = React.useMemo(() => {
    return filterIncidents(resolvedIncidents, {
      severity: resolvedSeverityFilter,
      type: resolvedTypeFilter,
      source: resolvedSourceFilter
    });
  }, [resolvedIncidents, resolvedSeverityFilter, resolvedTypeFilter, resolvedSourceFilter]);

  const resolvedSourceOptions = React.useMemo(() => {
    const sources = new Set(resolvedIncidents.map(i => i.source).filter(s => s && s !== "Unknown"));
    return ["any", ...Array.from(sources)];
  }, [resolvedIncidents]);

  return (
    <div className="flex-1">
      <Header
        title="Resolved Security Incidents"
        subtitle="View and manage resolved security incidents"
        incidents={resolvedIncidents}
        includeLogs={false}
      />
      <main className="p-8">
        <div className="flex flex-col gap-6 mb-6">
          <Breadcrumb items={[{ label: "Resolved Incidents" }]} />
        </div>
        <div className="space-y-6">

          <Card>
            <CardContent className="p-4">
              <IncidentFilters
                tempSeverity={tempResolvedSeverityFilter}
                setTempSeverity={setTempResolvedSeverityFilter}
                tempType={tempResolvedTypeFilter}
                setTempType={setTempResolvedTypeFilter}
                tempSource={tempResolvedSourceFilter}
                setTempSource={setTempResolvedSourceFilter}
                severityOptions={severityOptions}
                typeOptions={typeOptions}
                sourceOptions={resolvedSourceOptions}
                onApply={applyResolvedFilters}
                onReset={resetResolvedFilters}
                activeSeverity={resolvedSeverityFilter}
                activeType={resolvedTypeFilter}
                activeSource={resolvedSourceFilter}
                count={filteredResolvedIncidents.length}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Resolved Incidents ({filteredResolvedIncidents.length})</CardTitle>
              {resolvedIncidents.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleDeleteAllResolved}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Resolved
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isFiltering ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {filteredResolvedIncidents.map((incident) => (
                    <AlertCard
                      key={incident.id}
                      {...incident}
                      time={formatTimestamp(incident.time)}
                      statusMode="text"
                      onRemove={() => handleRemoveResolved(incident.id)}
                    />
                  ))}
                  {filteredResolvedIncidents.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No resolved incidents found matching the filters.
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
