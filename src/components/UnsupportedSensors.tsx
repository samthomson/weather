import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UnsupportedSensorsProps {
  sensors: string[];
}

export function UnsupportedSensors({ sensors }: UnsupportedSensorsProps) {
  if (sensors.length === 0) return null;

  return (
    <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
              Unsupported Sensors Detected
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This station is publishing data for sensors that are not yet supported by this viewer:
            </p>
            <div className="flex flex-wrap gap-2">
              {sensors.map((sensor) => (
                <code
                  key={sensor}
                  className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 rounded text-xs font-mono"
                >
                  {sensor}
                </code>
              ))}
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 pt-2">
              Please report these sensor types so they can be added to the viewer.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
