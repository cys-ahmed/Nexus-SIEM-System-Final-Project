import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  readonly title: string;
  readonly description: string;
  readonly severity: "critical" | "high" | "medium" | "low";
  readonly time: string;
  readonly source: string;
  readonly statusMode?: "scale" | "text" | "hidden";
  readonly recovery?: number;
  readonly stage?: string;
  readonly onRemove?: () => void;
  readonly actions?: React.ReactNode;
}

const renderRecoveryStatus = (statusMode: string, recovery: number, stage?: string) => {
  if (statusMode === "hidden") return null;
  if (statusMode === "text") {
    return <div className="text-xs text-muted-foreground">Complete</div>;
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Incident Recovery</span>
        <span>{recovery}%</span>
      </div>
      <div className="h-2 w-full rounded bg-muted">
        <div className="h-2 rounded bg-primary" style={{ width: `${recovery}%` }} />
      </div>
      {stage && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>Current Stage:</span>
          <span className="font-medium text-foreground">{stage}</span>
        </div>
      )}
    </div>
  );
};

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "Critical",
  },
  high: {
    icon: AlertCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    label: "High",
  },
  medium: {
    icon: Info,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "Medium",
  },
  low: {
    icon: Info,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Low",
  },
};

export default function AlertCard({ title, description, severity, time, source, statusMode = "scale", recovery: recoveryProp, stage, onRemove, actions }: AlertCardProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  const recovery = typeof recoveryProp === "number" ? recoveryProp : 0;

  return (
    <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn("rounded-lg p-2", config.bgColor)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={severity === "critical" || severity === "high" ? "destructive" : "secondary"}>
                  {config.label}
                </Badge>
                <h4 className="font-semibold text-foreground">{title}</h4>
              </div>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="text-xs rounded-md border px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {renderRecoveryStatus(statusMode, recovery, stage)}
            {actions && (
              <div className="mt-2">
                {actions}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{time}</span>
              <span>•</span>
              <span>{source}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
