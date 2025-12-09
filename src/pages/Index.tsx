import { useSeoMeta } from '@unhead/react';
import { Cloud, Droplets, Wind } from 'lucide-react';
import { useWeatherData } from '@/hooks/useWeatherData';
import { WeatherGauge } from '@/components/WeatherGauge';
import { WeatherChart } from '@/components/WeatherChart';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const RELAY_URL = 'wss://relay.samt.st';
const AUTHOR_PUBKEY = '55bb2db9b6b43291bc9ea64be226bf1dd0bbf60c71a7526c4f01ced3a2fc17f7';

const Index = () => {
  useSeoMeta({
    title: 'Weather Station',
    description: 'Real-time weather monitoring from Nostr relay',
  });

  const { data: readings, isLoading, error, refetch } = useWeatherData(RELAY_URL, AUTHOR_PUBKEY);
  const [units, setUnits] = useLocalStorage<'metric' | 'imperial'>('weather:units', 'metric');
  const [, setTick] = useState(0);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  // Update relative time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentReading = readings?.[0];

  // Filter data for last hour
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600; // 1 hour in seconds
  const lastHourReadings = readings?.filter(r => r.timestamp >= oneHourAgo) || [];

  // Convert temperature
  const convertTemp = (celsius: number) => {
    if (units === 'imperial') {
      return (celsius * 9/5) + 32;
    }
    return celsius;
  };

  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const tempLabel = units === 'imperial' ? 'Temperature (°F)' : 'Temperature (°C)';

  // Calculate relative time
  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp * 1000) / 1000); // difference in seconds

    if (diff < 60) {
      return `${diff} second${diff !== 1 ? 's' : ''} ago`;
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">
                Weather Station
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Real-time environmental monitoring from Nostr relay
              </p>
            </div>
            <Select value={units} onValueChange={(value: 'metric' | 'imperial') => setUnits(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">🥖 Metric</SelectItem>
                <SelectItem value="imperial">🍔 Imperial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Error state */}
        {error && (
          <Card className="mb-8 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-800 dark:text-red-300">
                ⚠️ Error loading weather data. Make sure the relay is accessible and the author pubkey is correct.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && !readings ? (
          <div className="space-y-8">
            {/* Gauge skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart skeleton */}
            <Card className="col-span-full border-0 shadow-lg">
              <CardContent className="p-6">
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : !currentReading ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No weather data available.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Current readings section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Current Conditions
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Last updated: <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(currentReading.timestamp * 1000).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span> ({getRelativeTime(currentReading.timestamp)})
              </p>
            </div>

            {/* Gauges grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <WeatherGauge
                label="Temperature"
                value={convertTemp(currentReading.temperature)}
                unit={tempUnit}
                icon={<Wind className="w-6 h-6 text-red-600" />}
                color="text-red-600"
                secondaryColor="bg-red-50 dark:bg-red-950/30"
              />

              <WeatherGauge
                label="Humidity"
                value={currentReading.humidity}
                unit="%"
                icon={<Droplets className="w-6 h-6 text-blue-600" />}
                color="text-blue-600"
                secondaryColor="bg-blue-50 dark:bg-blue-950/30"
              />

              <WeatherGauge
                label="PM2.5"
                value={currentReading.pm25}
                unit="µg/m³"
                icon={<Cloud className="w-6 h-6 text-purple-600" />}
                color="text-purple-600"
                secondaryColor="bg-purple-50 dark:bg-purple-950/30"
              />
            </div>

            {/* Historical data charts */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Trends
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              <WeatherChart
                data={lastHourReadings}
                units={units}
                title="Last Hour"
              />
              <WeatherChart
                data={readings || []}
                units={units}
                title="Last 24 Hours"
              />
            </div>

            {/* Footer info */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4">
              <p>Data sourced from Nostr relay · Kind 8765 · {readings?.length || 0} readings</p>
              <a href="https://shakespeare.diy" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                Vibed with Shakespeare
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
