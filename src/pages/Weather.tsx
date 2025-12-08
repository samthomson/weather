import { Cloud, Droplets, Wind } from 'lucide-react';
import { useWeatherData } from '@/hooks/useWeatherData';
import { WeatherGauge } from '@/components/WeatherGauge';
import { WeatherChart } from '@/components/WeatherChart';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RELAY_URL = 'wss://relay.samt.st';
const AUTHOR_PUBKEY = '55bb2db9b6b43291bc9ea64be226bf1dd0bbf60c71a7526c4f01ced3a2fc17f7';

export default function WeatherPage() {
  const { data: readings, isLoading, error, refetch } = useWeatherData(RELAY_URL, AUTHOR_PUBKEY);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const currentReading = readings?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-5"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-5"></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-5"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm bg-white/30 dark:bg-slate-900/30 sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 dark:from-blue-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                  Weather Station
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Real-time environmental monitoring from Nostr relay
                </p>
              </div>
              <Button
                onClick={() => {
                  setAutoRefresh(!autoRefresh);
                  refetch();
                }}
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                className="whitespace-nowrap"
              >
                {autoRefresh ? '🔄 Auto-refresh' : '🔄 Refresh'}
              </Button>
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
                  <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Current Conditions
                  </h2>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Last updated: {new Date(currentReading.timestamp * 1000).toLocaleString()}
                </p>
              </div>

              {/* Gauges grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <WeatherGauge
                  label="Temperature"
                  value={currentReading.temperature}
                  unit="°C"
                  min={-10}
                  max={50}
                  icon={<Wind className="w-6 h-6 text-red-600" />}
                  color="text-red-600"
                  secondaryColor="bg-red-50 dark:bg-red-950/30"
                />

                <WeatherGauge
                  label="Humidity"
                  value={currentReading.humidity}
                  unit="%"
                  min={0}
                  max={100}
                  icon={<Droplets className="w-6 h-6 text-blue-600" />}
                  color="text-blue-600"
                  secondaryColor="bg-blue-50 dark:bg-blue-950/30"
                />

                <WeatherGauge
                  label="PM2.5"
                  value={currentReading.pm25}
                  unit="µg/m³"
                  min={0}
                  max={100}
                  icon={<Cloud className="w-6 h-6 text-purple-600" />}
                  color="text-purple-600"
                  secondaryColor="bg-purple-50 dark:bg-purple-950/30"
                />
              </div>

              {/* Historical data chart */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Trends
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1">
                <WeatherChart data={readings || []} />
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
    </div>
  );
}
