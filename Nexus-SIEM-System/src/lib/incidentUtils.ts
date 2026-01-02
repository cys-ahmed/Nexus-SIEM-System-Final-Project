import { mapLogSeverity } from "./utils";

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  source: string;
  stageChecks?: string[];
  reviewNotes?: string;
}

export const processLogs = (logs: { id: number; message: string; severity: string; timestamp: string; source: string }[], type: string): Incident[] => {
  return logs.map((log) => ({
    id: `log-${log.id}`,
    title: `${type} Log`,
    description: log.message,
    severity: mapLogSeverity(log.severity),
    time: log.timestamp,
    source: log.source || "Unknown"
  }));
};

export const filterIncidents = (
  incidents: Incident[],
  filters: { severity: string; type: string; source: string }
) => {
  const { severity, type, source } = filters;

  return incidents.filter(incident => {
    const matchSeverity = severity === "any" || incident.severity === severity;

    let incidentType = "alert";
    if (incident.id.startsWith("log-")) {
      if (incident.title.includes("Authentication")) incidentType = "authentication";
      else if (incident.title.includes("System")) incidentType = "system";
    }

    const matchType = type === "any" || incidentType === type;
    const matchSource = source === "any" || incident.source === source;

    return matchSeverity && matchType && matchSource;
  });
};

export const mapDetectionToIncident = (d: any): Incident => ({
  id: d.Detection_Id.toString(),
  title: d.Rule_Name || "Untitled Incident",
  description: d.Description || "No description provided",
  severity: d.Severity ? d.Severity.toLowerCase() as Incident["severity"] : "medium",
  time: d.Timestamp,
  source: d.Rule_Category || "Unknown",
  stageChecks: [],
  reviewNotes: ""
});

export const mapResolvedToIncident = (a: any): Incident => ({
  id: a.Resolved_Id.toString(),
  title: a.Rule_Name || "Untitled Incident",
  description: a.Description || "No description provided",
  severity: a.Severity ? a.Severity.toLowerCase() as Incident["severity"] : "medium",
  time: a.Detection_Timestamp || a.Resolved_At,
  source: a.Rule_Category || "Unknown"
});

export const fetchAllIncidents = async (
  page: number,
  limit: number = 50,
  options: { onlyCriticalLogs?: boolean } = {}
) => {
  const offset = page * limit;

  const [detectionRes, authLogsRes, sysLogsRes, secLogsRes, errLogsRes] = await Promise.all([
    fetch(`/api/detections?status=new`),
    fetch(`/api/logs?logType=authentication&limit=${limit}&offset=${offset}`),
    fetch(`/api/logs?logType=system&limit=${limit}&offset=${offset}`),
    fetch(`/api/logs?logType=security&limit=${limit}&offset=${offset}`),
    fetch(`/api/logs?logType=error&limit=${limit}&offset=${offset}`)
  ]);

  const detectionData = await detectionRes.json();
  const authLogsData = await authLogsRes.json();
  const sysLogsData = await sysLogsRes.json();
  const secLogsData = await secLogsRes.json();
  const errLogsData = await errLogsRes.json();

  let newActiveIncidents: Incident[] = [];

  if (detectionData.success && Array.isArray(detectionData.detections)) {
    newActiveIncidents = [...newActiveIncidents, ...detectionData.detections.map(mapDetectionToIncident)];
  }

  const processAndFilterLogs = (logs: any[], type: string) => {
    const processed = processLogs(logs, type);
    return processed.filter(l => {
      const isSeverityMatch = !options.onlyCriticalLogs || (l.severity === "critical" || l.severity === "high");
      return isSeverityMatch;
    });
  };

  if (authLogsData.success) {
    newActiveIncidents = [...newActiveIncidents, ...processAndFilterLogs(authLogsData.logs, "Authentication")];
  }
  if (sysLogsData.success) {
    newActiveIncidents = [...newActiveIncidents, ...processAndFilterLogs(sysLogsData.logs, "System")];
  }
  if (secLogsData.success) {
    newActiveIncidents = [...newActiveIncidents, ...processAndFilterLogs(secLogsData.logs, "Security")];
  }
  if (errLogsData.success) {
    newActiveIncidents = [...newActiveIncidents, ...processAndFilterLogs(errLogsData.logs, "Error")];
  }

  const activeCount = detectionData.detections?.length || 0;
  const authCount = authLogsData.logs?.length || 0;
  const sysCount = sysLogsData.logs?.length || 0;
  const secCount = secLogsData.logs?.length || 0;
  const errCount = errLogsData.logs?.length || 0;

  const hasMore = !(activeCount === 0 && authCount === 0 && sysCount === 0 && secCount === 0 && errCount === 0);

  return { incidents: newActiveIncidents, hasMore };
};
