import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  readonly title: string;
  readonly description: string;
  readonly severity: "critical" | "high" | "medium" | "low";
  readonly time: string;
  readonly source: string;
  readonly onRemove?: () => void;
}

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

export default function Alert({ title, description, severity, time, source, onRemove }: AlertProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

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
