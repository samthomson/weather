import { Card, CardContent } from '@/components/ui/card';

interface WeatherGaugeProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string; // Tailwind color class
  secondaryColor?: string; // For the background
}

export function WeatherGauge({
  label,
  value,
  unit,
  icon,
  color,
  secondaryColor = 'bg-slate-100 dark:bg-slate-800',
}: WeatherGaugeProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with icon and label */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {label}
            </div>
            <div className={`p-2 rounded-lg ${secondaryColor}`}>
              {icon}
            </div>
          </div>

          {/* Large value display */}
          <div className="flex items-baseline gap-1.5">
            <span className={`text-5xl font-bold ${color}`}>
              {value.toFixed(1)}
            </span>
            <span className="text-xl font-medium text-slate-500 dark:text-slate-400">
              {unit}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
