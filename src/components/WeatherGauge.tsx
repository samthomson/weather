import { Card, CardContent } from '@/components/ui/card';

interface WeatherGaugeProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string; // Tailwind color class
  secondaryColor?: string; // For the background
  showGauge?: boolean; // Whether to show the circular gauge (only for humidity)
}

export function WeatherGauge({
  label,
  value,
  unit,
  icon,
  color,
  secondaryColor = 'bg-slate-100 dark:bg-slate-800',
  showGauge = false,
}: WeatherGaugeProps) {
  // Calculate percentage for the gauge fill (only used if showGauge is true)
  const percentage = showGauge ? Math.max(0, Math.min(100, value)) : 0;

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <CardContent className="p-6">
        <div className={showGauge ? "space-y-4" : "flex items-center justify-between"}>
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
          <div className={showGauge ? "space-y-2" : ""}>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-bold ${color}`}>
                {value.toFixed(1)}
              </span>
              <span className="text-lg font-medium text-slate-500 dark:text-slate-400">
                {unit}
              </span>
            </div>
          </div>

          {/* Circular gauge visualization (only for humidity) */}
          {showGauge && (
            <div className="flex justify-center py-4">
              <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-sm">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-200 dark:text-slate-700"
                />
                {/* Progress circle - using stroke-dasharray for partial circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(percentage / 100) * (2 * Math.PI * 50)} ${2 * Math.PI * 50}`}
                  strokeLinecap="round"
                  className={`${color} transition-all duration-500`}
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '60px 60px',
                  }}
                />
                {/* Center percentage text */}
                <text
                  x="60"
                  y="60"
                  textAnchor="middle"
                  dy="0.3em"
                  className="text-sm font-semibold fill-slate-700 dark:fill-slate-300"
                >
                  {Math.round(percentage)}%
                </text>
              </svg>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
