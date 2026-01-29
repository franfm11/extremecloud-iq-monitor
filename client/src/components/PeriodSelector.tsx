import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Period = "5m" | "1h" | "24h" | "7d" | "30d";

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "5m", label: "Last 5 min" },
  { value: "1h", label: "Last 1 hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export function PeriodSelector({ selectedPeriod, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((period) => (
        <Button
          key={period.value}
          variant={selectedPeriod === period.value ? "default" : "outline"}
          size="sm"
          onClick={() => onPeriodChange(period.value)}
          className={cn(
            selectedPeriod === period.value && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
