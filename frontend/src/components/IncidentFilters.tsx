import * as React from "react";
import { Button } from "@/components/ui/button";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IncidentFiltersProps {
  readonly tempSeverity: string;
  readonly setTempSeverity: (val: string) => void;
  readonly tempType: string;
  readonly setTempType: (val: string) => void;
  readonly tempSource: string;
  readonly setTempSource: (val: string) => void;
  readonly severityOptions: string[];
  readonly typeOptions: string[];
  readonly sourceOptions: string[];
  readonly onApply: () => void;
  readonly onReset: () => void;
  readonly activeSeverity: string;
  readonly activeType: string;
  readonly activeSource: string;
  readonly count: number;
}

export function IncidentFilters({
  tempSeverity,
  setTempSeverity,
  tempType,
  setTempType,
  tempSource,
  setTempSource,
  severityOptions,
  typeOptions,
  sourceOptions,
  onApply,
  onReset,
  activeSeverity,
  activeType,
  activeSource,
  count,
}: IncidentFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-1">
          <Select.Root value={tempSeverity} onValueChange={setTempSeverity}>
            <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
              <Select.Value placeholder="Severity" />
              <ChevronDown className="h-4 w-4" />
            </Select.Trigger>
            <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50">
              <div className="px-2 py-1 text-xs text-muted-foreground">
                Selected: {tempSeverity === "any" ? "Any Severity" : tempSeverity}
              </div>
              {severityOptions.map((opt) => (
                <Select.Item
                  key={opt}
                  value={opt}
                  className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                >
                  <Select.ItemText>
                    {opt === "any" ? "Any Severity" : opt.charAt(0).toUpperCase() + opt.slice(1)}
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
          <Select.Root value={tempType} onValueChange={setTempType}>
            <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
              <Select.Value placeholder="Type" />
              <ChevronDown className="h-4 w-4" />
            </Select.Trigger>
            <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50">
              <div className="px-2 py-1 text-xs text-muted-foreground">
                Selected: {tempType === "any" ? "Any Type" : tempType}
              </div>
              {typeOptions.map((opt) => (
                <Select.Item
                  key={opt}
                  value={opt}
                  className="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                >
                  <Select.ItemText>
                    {opt === "any" ? "Any Type" : opt.charAt(0).toUpperCase() + opt.slice(1)}
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
          <Select.Root value={tempSource} onValueChange={setTempSource}>
            <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
              <Select.Value placeholder="Source" />
              <ChevronDown className="h-4 w-4" />
            </Select.Trigger>
            <Select.Content position="popper" className="max-h-[200px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50">
              <div className="px-2 py-1 text-xs text-muted-foreground">
                Selected: {tempSource === "any" ? "Any Source" : tempSource}
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

        <div className="md:col-span-1 flex gap-2">
          <Button
            className="flex-1"
            onClick={onApply}
          >
            Filter
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Selected:</span>
        <Badge variant="secondary">Severity: {activeSeverity === "any" ? "Any" : activeSeverity}</Badge>
        <Badge variant="secondary">Type: {activeType === "any" ? "Any" : activeType}</Badge>
        <Badge variant="secondary">Source: {activeSource === "any" ? "Any" : activeSource}</Badge>
        <Badge variant="outline" className="ml-2">
          {count} incidents
        </Badge>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onReset}
        >
          Reset (Any)
        </Button>
      </div>
    </div>
  );
}
