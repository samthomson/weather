import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface WeatherGaugeProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string; // Tailwind color class
  secondaryColor?: string; // For the background
  showAirQualityScale?: boolean; // Show PM2.5 air quality scale
  sensorName?: string; // Name of the physical sensor
}

// PM2.5 Air Quality Scale
function getAirQualityInfo(pm25: number): { label: string; description: string; color: string; bgColor: string } {
  if (pm25 <= 12) {
    return {
      label: 'Very Good',
      description: 'Air quality is excellent. No health concerns.',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30'
    };
  } else if (pm25 <= 35) {
    return {
      label: 'Moderate',
      description: 'Air quality is acceptable. Air is OK but not clean.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30'
    };
  } else if (pm25 <= 55) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      description: 'People with respiratory conditions should limit prolonged outdoor exertion.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30'
    };
  } else {
    return {
      label: 'Bad',
      description: 'Everyone may experience health effects. Avoid prolonged outdoor activity.',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30'
    };
  }
}

export function WeatherGauge({
  label,
  value,
  unit,
  icon,
  color,
  secondaryColor = 'bg-slate-100 dark:bg-slate-800',
  showAirQualityScale = false,
  sensorName,
}: WeatherGaugeProps) {
  const airQuality = showAirQualityScale ? getAirQualityInfo(value) : null;
  const displayColor = airQuality ? airQuality.color : color;
  const displayBgColor = airQuality ? airQuality.bgColor : secondaryColor;

  return (
    <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Header with icon and label */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className={`p-3 rounded-xl ${displayBgColor} shadow-sm`}>
              {icon}
            </div>
          </div>

          {/* Large value display */}
          <div className="flex items-baseline gap-2">
            <span className={`text-6xl font-bold ${displayColor}`}>
              {value.toFixed(1)}
            </span>
            <span className="text-2xl font-semibold text-slate-400 dark:text-slate-500">
              {unit}
            </span>
          </div>

          {/* Air quality scale (only for PM2.5) */}
          {showAirQualityScale && airQuality && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`text-sm font-semibold ${displayColor}`}>
                  {airQuality.label}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className={`w-4 h-4 ${displayColor} cursor-help`} />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-semibold">{airQuality.label}</p>
                        <p className="text-sm">{airQuality.description}</p>
                        <div className="text-xs space-y-1 pt-2 border-t">
                          <p><strong>0-12 µg/m³:</strong> Very Good</p>
                          <p><strong>12-35 µg/m³:</strong> Moderate</p>
                          <p><strong>35-55 µg/m³:</strong> Unhealthy for Sensitive</p>
                          <p><strong>55+ µg/m³:</strong> Bad</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative h-2 bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500 rounded-full">
                {/* Indicator marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-slate-900 dark:bg-white rounded-full"
                  style={{
                    left: `${Math.min(100, (value / 70) * 100)}%`,
                    transform: 'translateX(-50%) translateY(-50%)'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>0</span>
                <span>12</span>
                <span>35</span>
                <span>55</span>
                <span>70+</span>
              </div>
            </div>
          )}

          {/* Sensor name (if provided) */}
          {sensorName && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Sensor: <span className="font-mono">{sensorName}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
