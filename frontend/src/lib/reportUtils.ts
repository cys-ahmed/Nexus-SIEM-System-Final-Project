import { LogEntry } from "@/hook/useLogs";
import { formatTimestamp } from "@/lib/utils";

export interface Incident {
  time: string;
  title: string;
  severity: string;
  source: string;
  description: string;
}

export interface SecurityOverview {
  openIncidents: number;
  resolvedIncidents: number;
  securityLogs: number;
  assetsMonitored: number;
  recentAlerts?: Array<{ title: string; description: string; severity: string; time: string; source: string }>;
  threatCategories?: Array<{ name: string; count: number; percentage: number }>;
  topAffectedSystems?: Array<{ name: string; alerts: number; status: string }>;
}

export interface AvailabilityData {
  devices: Array<{
    name: string;
    ip: string;
    type: string;
    status: string;
    lastPingMs?: number;
    lastChecked?: string;
  }>;
  users: Array<{
    user_id: number;
    username: string;
    email: string;
    role_name: string;
  }>;
}

export const fetchIncidentData = async (isoStartDate?: string, isoEndDate?: string): Promise<Incident[]> => {
  const params = new URLSearchParams();
  if (isoStartDate) params.append('startDate', isoStartDate);
  if (isoEndDate) params.append('endDate', isoEndDate);

  const res = await fetch(`/api/detections?${params.toString()}`);
  const data = await res.json();

  if (data.success && Array.isArray(data.detections)) {
    return data.detections.map((d: any) => ({
      time: d.Timestamp,
      title: d.Rule_Name || "Untitled Incident",
      severity: d.Severity ? d.Severity.toLowerCase() : "medium",
      source: d.Rule_Category || "Unknown",
      description: d.Description || "No description provided"
    }));
  }
  return [];
};

const getSeverityColor = (severity: string) => {
  const sev = (severity || 'UNKNOWN').toUpperCase();
  if (sev === 'CRITICAL') return '#dc2626';
  if (sev === 'HIGH') return '#f59e0b';
  return '#3b82f6';
};

const getLogSeverityColor = (severity: string) => {
  if (severity === 'ERROR') return '#dc2626';
  if (severity === 'WARNING') return '#f59e0b';
  return '#3b82f6';
};

const getStatusColor = (status: string) => {
  if (status === 'Online') return '#16a34a';
  if (status === 'Offline') return '#dc2626';
  return '#4b5563';
};

interface PdfHtmlProps {
  title: string;
  incidents?: Incident[];
  logs?: LogEntry[];
  securityOverviewHtml: string;
  availabilityDataHtml: string;
}

export const generatePdfHtml = ({ title, incidents, logs, securityOverviewHtml, availabilityDataHtml }: PdfHtmlProps) => {
  const incidentsHtml = incidents && incidents.length > 0
    ? incidents.map((inc, index) => `
      <div style="border-bottom: 1px solid #ddd; padding: 10px; margin-bottom: 10px;">
        <strong>[${index + 1}]</strong> ${formatTimestamp(inc.time)}<br/>
        <span style="color: ${getSeverityColor(inc.severity)}">
          Severity: ${(inc.severity || 'UNKNOWN').toUpperCase()}
        </span> | Source: ${inc.source}<br/>
        <strong>Title:</strong> ${inc.title}<br/>
        <div style="margin-top: 5px;">${inc.description}</div>
      </div>
    `).join('')
    : '';

  const logsHtml = logs && logs.length > 0
    ? logs.map((log, index) => `
      <div style="border-bottom: 1px solid #ddd; padding: 10px; margin-bottom: 10px;">
        <strong>[${index + 1}]</strong> ${formatTimestamp(log.timestamp)}<br/>
        <span style="color: ${getLogSeverityColor(log.severity)}">
          Severity: ${log.severity}
        </span> | Source: ${log.source} ${log.ip ? `| IP: ${log.ip}` : ''}<br/>
        <div style="margin-top: 5px;">${log.message}</div>
      </div>
    `).join('')
    : '<p>No logs available</p>';

  return `
    <html>
      <head>
        <title>${title} Report</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #333; }
          pre { white-space: pre-wrap; }
          .log-entry { border-bottom: 1px solid #ddd; padding: 10px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>${title} Report</h1>
        <p><strong>Generated:</strong> ${formatTimestamp(new Date().toISOString())}</p>
        
        ${securityOverviewHtml}
        ${availabilityDataHtml}

        ${incidents && incidents.length > 0 ? `
          <h2>Active Security Incidents (${incidents.length} entries)</h2>
          ${incidentsHtml}
          <br/>
        ` : ''}

        ${logs && logs.length > 0 ? `<h2>Security Logs (${logs.length} entries)</h2>` : ''}
        ${logsHtml}

        <script>window.print();</script>
      </body>
    </html>
  `;
};

export const generateSecurityOverviewSection = (overview: SecurityOverview) => {
  let content = `SECURITY OVERVIEW
${'='.repeat(80)}
Open Incidents:     ${overview.openIncidents}
Resolved Incidents: ${overview.resolvedIncidents}
Security Logs:      ${overview.securityLogs}
Assets Monitored:   ${overview.assetsMonitored}
${'='.repeat(80)}

`;

  if (overview.recentAlerts && overview.recentAlerts.length > 0) {
    content += `RECENT SECURITY ALERTS (${overview.recentAlerts.length} entries)
${'-'.repeat(80)}
`;
    overview.recentAlerts.forEach((alert, index) => {
      content += `[${index + 1}] ${formatTimestamp(alert.time)}
  Title: ${alert.title}
  Severity: ${alert.severity}
  Source: ${alert.source}
  Description: ${alert.description}
${'-'.repeat(80)}
`;
    });
    content += `\n`;
  }

  if (overview.threatCategories && overview.threatCategories.length > 0) {
    content += `THREAT CATEGORIES
${'-'.repeat(80)}
`;
    overview.threatCategories.forEach((cat) => {
      content += `${cat.name}: ${cat.count} (${cat.percentage}%)\n`;
    });
    content += `\n`;
  }

  if (overview.topAffectedSystems && overview.topAffectedSystems.length > 0) {
    content += `TOP AFFECTED SYSTEMS
${'-'.repeat(80)}
`;
    overview.topAffectedSystems.forEach((sys) => {
      content += `${sys.name}: ${sys.alerts} alerts (${sys.status})\n`;
    });
    content += `\n`;
  }
  return content;
};

export const generateAvailabilitySection = (data: AvailabilityData) => {
  let content = '';
  if (data.devices && data.devices.length > 0) {
    content += `DEVICE STATUS (${data.devices.length} entries)
${'='.repeat(80)}
`;
    data.devices.forEach((d) => {
      content += `Name: ${d.name} | IP: ${d.ip} | Type: ${d.type}
Status: ${d.status} | Last Ping: ${typeof d.lastPingMs === "number" ? `${d.lastPingMs} ms` : "-"} | Checked: ${d.lastChecked ?? "-"}
${'-'.repeat(80)}
`;
    });
    content += `\n`;
  }

  if (data.users && data.users.length > 0) {
    content += `USERS (${data.users.length} entries)
${'='.repeat(80)}
`;
    data.users.forEach((u) => {
      content += `ID: ${u.user_id} | Name: ${u.username} | Email: ${u.email} | Role: ${u.role_name}
${'-'.repeat(80)}
`;
    });
    content += `\n`;
  }
  return content;
};

export const generateIncidentsSection = (incidentsList: Incident[]) => {
  let content = `ACTIVE SECURITY INCIDENTS (${incidentsList.length} entries)
${'='.repeat(80)}

`;
  incidentsList.forEach((inc, index) => {
    content += `[${index + 1}] ${formatTimestamp(inc.time)}
  Title: ${inc.title}
  Severity: ${inc.severity}
  Source: ${inc.source}
  Description: ${inc.description}
${'-'.repeat(80)}
`;
  });
  content += `\n`;
  return content;
};

export const generateLogsSection = (logsList: LogEntry[]) => {
  let content = `SECURITY LOGS (${logsList.length} entries)
${'='.repeat(80)}

`;
  logsList.forEach((log, index) => {
    content += `[${index + 1}] ${formatTimestamp(log.timestamp)}
  Severity: ${log.severity}
  Source: ${log.source}
  ${log.ip ? `IP: ${log.ip}` : ''}
  Message: ${log.message}
${'-'.repeat(80)}
`;
  });
  return content;
};

export const generateReportContent = (
  title: string,
  subtitle: string | undefined,
  logsToUse: LogEntry[],
  incidentsToUse: Incident[],
  securityOverview?: SecurityOverview,
  availabilityData?: AvailabilityData
) => {
  const timestamp = formatTimestamp(new Date().toISOString());
  let content = `NEXUS SIEM SYSTEM REPORT
Generated: ${timestamp}
Page: ${title}
${subtitle ? `Subtitle: ${subtitle}` : ''}

`;

  if (securityOverview) {
    content += generateSecurityOverviewSection(securityOverview);
  }

  if (availabilityData) {
    content += generateAvailabilitySection(availabilityData);
  }

  if (incidentsToUse && incidentsToUse.length > 0) {
    content += generateIncidentsSection(incidentsToUse);
  }

  if (logsToUse && logsToUse.length > 0) {
    content += generateLogsSection(logsToUse);
  } else {
    content += `Report Content:
This is a sample report generated from the ${title} page.
Timestamp: ${timestamp}
`;
  }

  return content;
};

export const getSecurityOverviewHtml = (securityOverview?: SecurityOverview) => {
  if (!securityOverview) return '';
  return `
    <h2>Security Overview</h2>
    <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div><strong>Open Incidents:</strong> ${securityOverview.openIncidents}</div>
      <div><strong>Resolved Incidents:</strong> ${securityOverview.resolvedIncidents}</div>
      <div><strong>Security Logs:</strong> ${securityOverview.securityLogs}</div>
      <div><strong>Assets Monitored:</strong> ${securityOverview.assetsMonitored}</div>
    </div>
    <br/>
    ${securityOverview.threatCategories && securityOverview.threatCategories.length > 0 ? `
      <h3>Threat Categories</h3>
      <ul>
        ${securityOverview.threatCategories.map(cat => `
          <li><strong>${cat.name}:</strong> ${cat.count} (${cat.percentage}%)</li>
        `).join('')}
      </ul>
      <br/>
    ` : ''}
    ${securityOverview.topAffectedSystems && securityOverview.topAffectedSystems.length > 0 ? `
      <h3>Top Affected Systems</h3>
      <ul>
        ${securityOverview.topAffectedSystems.map(sys => `
          <li><strong>${sys.name}:</strong> ${sys.alerts} alerts (${sys.status})</li>
        `).join('')}
      </ul>
      <br/>
    ` : ''}
    ${securityOverview.recentAlerts && securityOverview.recentAlerts.length > 0 ? `
      <h3>Recent Security Alerts</h3>
      ${securityOverview.recentAlerts.map((alert, index) => `
        <div style="border-bottom: 1px solid #ddd; padding: 10px; margin-bottom: 10px;">
          <strong>[${index + 1}]</strong> ${formatTimestamp(alert.time)}<br/>
          <span style="color: ${getSeverityColor(alert.severity)}">
            Severity: ${alert.severity}
          </span> | Source: ${alert.source}<br/>
          <strong>Title:</strong> ${alert.title}<br/>
          <div style="margin-top: 5px;">${alert.description}</div>
        </div>
      `).join('')}
      <br/>
    ` : ''}
  `;
};

export const getAvailabilityDataHtml = (availabilityData?: AvailabilityData) => {
  if (!availabilityData) return '';
  return `
    ${availabilityData.devices && availabilityData.devices.length > 0 ? `
      <h2>Device Status (${availabilityData.devices.length} entries)</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">IP</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Type</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Last Ping</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Checked</th>
          </tr>
        </thead>
        <tbody>
          ${availabilityData.devices.map(d => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${d.name}</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${d.ip}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${d.type}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">
                <span style="color: ${getStatusColor(d.status)}">
                  ${d.status}
                </span>
              </td>
              <td style="border: 1px solid #ddd; padding: 8px;">${typeof d.lastPingMs === "number" ? `${d.lastPingMs} ms` : "-"}</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-size: 0.8em;">${d.lastChecked ?? "-"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    ${availabilityData.users && availabilityData.users.length > 0 ? `
      <h2>Users (${availabilityData.users.length} entries)</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">ID</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Role</th>
          </tr>
        </thead>
        <tbody>
          ${availabilityData.users.map(u => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${u.user_id}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${u.username}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${u.email}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${u.role_name}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  `;
};
