import { Button } from "@/components/ui/button";
import { FileText, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { fetchLogs, LogEntry } from "@/hook/useLogs";
import {
  generatePdfHtml,
  generateReportContent,
  getSecurityOverviewHtml,
  getAvailabilityDataHtml,
  Incident,
  SecurityOverview,
  AvailabilityData,
  fetchIncidentData
} from "@/lib/reportUtils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showReport?: boolean;
  logs?: LogEntry[];
  incidents?: Incident[];
  includeLogs?: boolean;
  securityOverview?: SecurityOverview;
  availabilityData?: AvailabilityData;
}

export default function Header({ title, subtitle, showReport = true, logs, incidents, includeLogs = true, securityOverview, availabilityData }: Readonly<HeaderProps>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const getExportData = async () => {
    let currentLogs: LogEntry[] = logs || [];
    let currentIncidents: Incident[] = incidents || [];

    if (!includeLogs) return { currentLogs: [], currentIncidents };

    if (startDate || endDate) {
      try {
        const isoStartDate = startDate ? new Date(startDate).toISOString() : undefined;
        const isoEndDate = endDate ? new Date(endDate).toISOString() : undefined;

        const [fetchedLogs, fetchedIncidents] = await Promise.all([
          fetchLogs({ startDate: isoStartDate, endDate: isoEndDate }),
          fetchIncidentData(isoStartDate, isoEndDate)
        ]);

        currentLogs = fetchedLogs;
        currentIncidents = fetchedIncidents;
      } catch (error) {
        console.error("Data fetch failed:", error);
        currentLogs = [];
      }
    } else if (currentLogs.length === 0) {
      try {
        currentLogs = await fetchLogs();
      } catch (error) {
        console.error("Logs fetch failed:", error);
      }
    }
    return { currentLogs, currentIncidents };
  };

  const handlePdfExport = (currentLogs: LogEntry[], currentIncidents: Incident[]) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const pdfHtml = generatePdfHtml({
        title,
        incidents: currentIncidents,
        logs: currentLogs,
        securityOverviewHtml: getSecurityOverviewHtml(securityOverview),
        availabilityDataHtml: getAvailabilityDataHtml(availabilityData)
      });

      printWindow.document.writeln(pdfHtml);
      printWindow.document.close();
    }
  };

  const handleLogExport = (currentLogs: LogEntry[], currentIncidents: Incident[]) => {
    const content = generateReportContent(
      title,
      subtitle,
      currentLogs,
      currentIncidents,
      securityOverview,
      availabilityData
    );
    const timestamp = new Date().toISOString().split('T')[0];

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: string) => {
    setIsGenerating(true);
    const { currentLogs, currentIncidents } = await getExportData();

    if (format === 'PDF') {
      handlePdfExport(currentLogs, currentIncidents);
    } else if (format === 'LOG') {
      handleLogExport(currentLogs, currentIncidents);
    }

    setTimeout(() => setIsGenerating(false), 500);
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-8 py-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {showReport && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Start Date & Time</Label>
                  <div className="relative">
                    <Input
                      id="start-date"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      ref={startDateRef}
                      className="pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden peer"
                    />
                    <CalendarIcon
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-primary peer-focus:text-primary active:text-primary cursor-pointer transition-colors"
                      onClick={() => startDateRef.current?.showPicker()}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">End Date & Time</Label>
                  <div className="relative">
                    <Input
                      id="end-date"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      ref={endDateRef}
                      className="pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden peer"
                    />
                    <CalendarIcon
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-primary peer-focus:text-primary active:text-primary cursor-pointer transition-colors"
                      onClick={() => endDateRef.current?.showPicker()}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('PDF')}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('LOG')}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Download Log File"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </header>
  );
}
