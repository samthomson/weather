import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SensorToggleProps {
  availableSensors: string[];
  visibleSensors: string[];
  onToggle: (sensor: string, visible: boolean) => void;
  onSetAll: (sensors: string[]) => void;
}

export function SensorToggle({ availableSensors, visibleSensors, onToggle, onSetAll }: SensorToggleProps) {
  const [open, setOpen] = useState(false);

  const handleSelectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Select All clicked', availableSensors);
    onSetAll([...availableSensors]);
  };

  const handleSelectNone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Select None clicked');
    onSetAll([]);
  };

  const getSensorLabel = (sensor: string): string => {
    const labels: Record<string, string> = {
      'temp': 'Temperature',
      'humidity': 'Humidity',
      'pm1': 'PM1.0',
      'pm25': 'PM2.5',
      'pm10': 'PM10',
      'air_quality': 'Air Quality Index',
      'pressure': 'Pressure',
      'light': 'Light',
      'rain': 'Rain Sensor',
    };
    return labels[sensor] || sensor.toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <span>Sensors</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">Visible Sensors</div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
              >
                All
              </button>
              <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={handleSelectNone}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {availableSensors.map((sensor) => (
              <div key={sensor} className="flex items-center space-x-2">
                <Checkbox
                  id={`sensor-${sensor}`}
                  checked={visibleSensors.includes(sensor)}
                  onCheckedChange={(checked) => onToggle(sensor, checked as boolean)}
                />
                <Label
                  htmlFor={`sensor-${sensor}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {getSensorLabel(sensor)}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
