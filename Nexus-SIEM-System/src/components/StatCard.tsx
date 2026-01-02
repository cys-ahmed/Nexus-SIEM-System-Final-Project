import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "warning" | "danger" | "success";
  titleColor?: string;
}

export default function StatCard({ title, value, icon: Icon, trend, variant = "default", titleColor }: Readonly<StatCardProps>) {
  const variantStyles = {
    default: "text-primary",
    warning: "text-warning",
    danger: "text-destructive",
    success: "text-success",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn("text-sm", titleColor || "text-muted-foreground")}>{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <p className={cn("text-sm", trend.isPositive ? "text-success" : "text-destructive")}>
                {trend.value}
              </p>
            )}
          </div>
          <div className={cn("rounded-lg bg-secondary p-3", variantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
