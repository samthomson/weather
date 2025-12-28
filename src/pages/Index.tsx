import { useSeoMeta } from '@unhead/react';
import { AlertTriangle, Cloud, Droplets, Wind, ChevronDown, Search } from 'lucide-react';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import { WeatherGauge } from '@/components/WeatherGauge';
import { WeatherChart } from '@/components/WeatherChart';
import { SensorToggle } from '@/components/SensorToggle';
import { UnsupportedSensors } from '@/components/UnsupportedSensors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const RELAY_URL = 'wss://relay.samt.st';

const Index = () => {
  useSeoMeta({
    title: 'Weather Station',
    description: 'Real-time weather monitoring from Nostr relay',
  });

  const { data: stations, isLoading: stationsLoading } = useWeatherStations(RELAY_URL);
  const [selectedStation, setSelectedStation] = useLocalStorage<string | null>('weather:selected-station', null);

  // Auto-select first station if none selected
  const activeStationPubkey = selectedStation || stations?.[0]?.pubkey || null;

  const { data, isLoading, error, refetch } = useWeatherData(
    RELAY_URL,
    activeStationPubkey || ''
  );
  const readings = data?.readings;
  const flaggedReadings = data?.flaggedReadings || [];
  const stationMetadata = data?.stationMetadata;
  const detectedSensors = data?.detectedSensors;

  const [units, setUnits] = useLocalStorage<'metric' | 'imperial'>('weather:units', 'metric');

  // Separate visibility states for each component
  const [visibleSensorsLastHour, setVisibleSensorsLastHour] = useLocalStorage<string[]>(
    'weather:visible-sensors-last-hour',
    []
  );
  const [visibleSensors24Hour, setVisibleSensors24Hour] = useLocalStorage<string[]>(
    'weather:visible-sensors-24-hour',
    []
  );
  const [visibleSensorsTable, setVisibleSensorsTable] = useLocalStorage<string[]>(
    'weather:visible-sensors-table',
    []
  );
  const [, setTick] = useState(0);
  const [stationSearchOpen, setStationSearchOpen] = useState(false);

  // Initialize visible sensors when detected sensors change (only once per station)
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (detectedSensors && !initialized) {
      if (visibleSensorsLastHour.length === 0) {
        setVisibleSensorsLastHour(detectedSensors.supported);
      }
      if (visibleSensors24Hour.length === 0) {
        setVisibleSensors24Hour(detectedSensors.supported);
      }
      if (visibleSensorsTable.length === 0) {
        setVisibleSensorsTable(detectedSensors.supported);
      }
      setInitialized(true);
    }
  }, [detectedSensors, initialized, visibleSensorsLastHour.length, visibleSensors24Hour.length, visibleSensorsTable.length, setVisibleSensorsLastHour, setVisibleSensors24Hour, setVisibleSensorsTable]);

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

  // Check which sensors are available for gauge cards (always show all)
  const availableSensors = React.useMemo(() => {
    if (!detectedSensors) return { hasTemp: false, hasHumidity: false, hasPM: false };

    const hasTemp = detectedSensors.supported.includes('temp');
    const hasHumidity = detectedSensors.supported.includes('humidity');
    const hasPM = ['pm1', 'pm25', 'pm10'].some(pm => detectedSensors.supported.includes(pm));

    return { hasTemp, hasHumidity, hasPM };
  }, [detectedSensors]);

  // Split data: last hour (detailed) vs 24 hour (all readings for matching)
  const { lastHourReadings, last24HourReadings } = React.useMemo(() => {
    if (!readings) return { lastHourReadings: [], last24HourReadings: [] };

    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600; // 1 hour in seconds

    // Last hour: detailed readings from past hour
    const lastHour = readings.filter(r => r.timestamp >= oneHourAgo);

    // Last 24 hours: pass ALL readings - chart will match to hourly slots
    return {
      lastHourReadings: lastHour,
      last24HourReadings: readings,
    };
  }, [readings]);

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800/50">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-6 h-6 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Weather Stations</span>
            </div>

            {/* Units selector */}
            <Select value={units} onValueChange={(value: 'metric' | 'imperial') => setUnits(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">
                  <span className="flex items-center gap-2">
                    <span>🥖</span>
                    <span>Metric</span>
                  </span>
                </SelectItem>
                <SelectItem value="imperial">
                  <span className="flex items-center gap-2">
                    <span>🍔</span>
                    <span>Imperial</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Station selector tabs */}
      {stations && stations.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4 pt-2">
              <div className="flex gap-1 overflow-x-auto">
                {stations.slice(0, 5).map((station) => {
                  const isActive = station.pubkey === activeStationPubkey;
                  return (
                    <button
                      key={station.pubkey}
                      onClick={() => setSelectedStation(station.pubkey)}
                      className={`
                        px-5 py-3 rounded-t-xl font-medium transition-all whitespace-nowrap text-sm border-t-2 border-x-2
                        ${isActive
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }
                      `}
                    >
                      {station.name}
                    </button>
                  );
                })}
              </div>

              {/* Station search dropdown */}
              <div className="pb-2">
                <Popover open={stationSearchOpen} onOpenChange={setStationSearchOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">
                      <Search className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-600 dark:text-slate-400 text-xs">Search</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search stations..." />
                      <CommandList>
                        <CommandEmpty>No stations found.</CommandEmpty>
                        <CommandGroup>
                          {stations.map((station) => (
                            <CommandItem
                              key={station.pubkey}
                              onSelect={() => {
                                setSelectedStation(station.pubkey);
                                setStationSearchOpen(false);
                              }}
                              className="flex flex-col items-start gap-1 py-3"
                            >
                              <div className="font-semibold">{station.name}</div>
                              {station.location && (
                                <div className="text-xs text-slate-500">📍 {station.location}</div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single station header (when only one station) */}
      {(!stations || stations.length <= 1) && stationMetadata && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium text-sm shadow-md">
                {stationMetadata.name || 'Weather Station'}
              </div>
              {stationMetadata.location && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  📍 {stationMetadata.location}
                </span>
              )}
              {stationMetadata.elevation && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  ⛰️ {stationMetadata.elevation}m
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content - tab content area */}
      <div className="bg-white dark:bg-slate-950 min-h-screen">
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
            {/* Unsupported Sensors Alert */}
            {detectedSensors && detectedSensors.unsupported.length > 0 && (
              <UnsupportedSensors sensors={detectedSensors.unsupported} />
            )}

            {/* Current readings section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Current Conditions
                </h2>
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
                  </span> <span className="text-slate-500">({getRelativeTime(currentReading.timestamp)})</span>
                </p>
              </div>
            </div>

            {/* Gauges grid - adaptive based on available sensors */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableSensors.hasTemp && currentReading.temperature !== undefined && (
                <WeatherGauge
                  label="Temperature"
                  value={convertTemp(currentReading.temperature)}
                  unit={tempUnit}
                  icon={<Wind className="w-6 h-6 text-red-600" />}
                  color="text-red-600"
                  secondaryColor="bg-red-50 dark:bg-red-950/30"
                  sensorName={currentReading.sensorModels?.temp || 'temp'}
                />
              )}

              {availableSensors.hasHumidity && currentReading.humidity !== undefined && (
                <WeatherGauge
                  label="Humidity"
                  value={currentReading.humidity}
                  unit="%"
                  icon={<Droplets className="w-6 h-6 text-blue-600" />}
                  color="text-blue-600"
                  secondaryColor="bg-blue-50 dark:bg-blue-950/30"
                  sensorName={currentReading.sensorModels?.humidity || 'humidity'}
                />
              )}

              {currentReading.pm1 !== undefined && currentReading.pm1 > 0 && (
                <WeatherGauge
                  label="PM1.0"
                  value={currentReading.pm1}
                  unit="µg/m³"
                  icon={<Cloud className="w-6 h-6" />}
                  color="text-purple-600"
                  secondaryColor="bg-purple-50 dark:bg-purple-950/30"
                  showAirQualityScale={true}
                  sensorName={currentReading.sensorModels?.pm1 || 'pm1'}
                />
              )}

              {currentReading.pm25 !== undefined && currentReading.pm25 > 0 && (
                <WeatherGauge
                  label="PM2.5"
                  value={currentReading.pm25}
                  unit="µg/m³"
                  icon={<Cloud className="w-6 h-6" />}
                  color="text-purple-600"
                  secondaryColor="bg-purple-50 dark:bg-purple-950/30"
                  showAirQualityScale={true}
                  sensorName={currentReading.sensorModels?.pm25 || 'pm25'}
                />
              )}

              {currentReading.pm10 !== undefined && currentReading.pm10 > 0 && (
                <WeatherGauge
                  label="PM10"
                  value={currentReading.pm10}
                  unit="µg/m³"
                  icon={<Cloud className="w-6 h-6" />}
                  color="text-purple-600"
                  secondaryColor="bg-purple-50 dark:bg-purple-950/30"
                  showAirQualityScale={true}
                  sensorName={currentReading.sensorModels?.pm10 || 'pm10'}
                />
              )}

              {currentReading.air_quality !== undefined && currentReading.air_quality > 0 && (
                <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Air Quality Index
                        </div>
                        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 shadow-sm">
                          <Cloud className="w-6 h-6 text-green-600" />
                        </div>
                      </div>

                      {/* Large value display */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-bold text-green-600">
                          {currentReading.air_quality.toFixed(0)}
                        </span>
                        <span className="text-2xl font-semibold text-slate-400 dark:text-slate-500">
                          / 1000
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                            style={{ width: `${(currentReading.air_quality / 1000) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>0</span>
                          <span>500</span>
                          <span>1000</span>
                        </div>
                      </div>

                      {/* Sensor name */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Sensor: <span className="font-mono">{currentReading.sensorModels?.air_quality || 'air_quality'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Historical data charts */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Trends
              </h2>
            </div>

            <div className="space-y-6">
              <WeatherChart
                data={lastHourReadings}
                units={units}
                title="Last Hour"
                availableSensors={detectedSensors?.supported || []}
                visibleSensors={visibleSensorsLastHour}
                onSensorToggle={(sensor, visible) => {
                  if (visible) {
                    setVisibleSensorsLastHour([...visibleSensorsLastHour, sensor]);
                  } else {
                    setVisibleSensorsLastHour(visibleSensorsLastHour.filter(s => s !== sensor));
                  }
                }}
                onSetAll={setVisibleSensorsLastHour}
              />
              <WeatherChart
                data={last24HourReadings}
                units={units}
                title="Last 24 Hours"
                availableSensors={detectedSensors?.supported || []}
                visibleSensors={visibleSensors24Hour}
                onSensorToggle={(sensor, visible) => {
                  if (visible) {
                    setVisibleSensors24Hour([...visibleSensors24Hour, sensor]);
                  } else {
                    setVisibleSensors24Hour(visibleSensors24Hour.filter(s => s !== sensor));
                  }
                }}
                onSetAll={setVisibleSensors24Hour}
              />
            </div>

            {/* Recent Events Table */}
            {readings && readings.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Recent Events
                </h2>
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardHeader className="pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Last 50 Readings
                      </CardTitle>
                      {detectedSensors && detectedSensors.supported.length > 0 && (
                        <SensorToggle
                          availableSensors={detectedSensors.supported}
                          visibleSensors={visibleSensorsTable}
                          onToggle={(sensor, visible) => {
                            if (visible) {
                              setVisibleSensorsTable([...visibleSensorsTable, sensor]);
                            } else {
                              setVisibleSensorsTable(visibleSensorsTable.filter(s => s !== sensor));
                            }
                          }}
                          onSetAll={setVisibleSensorsTable}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          {visibleSensorsTable.includes('temp') && <TableHead>Temperature</TableHead>}
                          {visibleSensorsTable.includes('humidity') && <TableHead>Humidity</TableHead>}
                          {visibleSensorsTable.includes('pm1') && <TableHead>PM1</TableHead>}
                          {visibleSensorsTable.includes('pm25') && <TableHead>PM2.5</TableHead>}
                          {visibleSensorsTable.includes('pm10') && <TableHead>PM10</TableHead>}
                          {visibleSensorsTable.includes('air_quality') && <TableHead>Air Quality</TableHead>}
                          <TableHead>Event</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {readings.slice(0, 50).map((reading, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">
                              {new Date(reading.timestamp * 1000).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </TableCell>
                            {visibleSensorsTable.includes('temp') && reading.temperature !== undefined && (
                              <TableCell className="font-semibold">
                                {convertTemp(reading.temperature).toFixed(1)}{tempUnit}
                              </TableCell>
                            )}
                            {visibleSensorsTable.includes('humidity') && reading.humidity !== undefined && (
                              <TableCell className="font-semibold">
                                {reading.humidity.toFixed(1)}%
                              </TableCell>
                            )}
                            {visibleSensorsTable.includes('pm1') && (
                              <TableCell className="font-semibold">
                                {(reading.pm1 || 0).toFixed(1)}
                              </TableCell>
                            )}
                            {visibleSensorsTable.includes('pm25') && (
                              <TableCell className="font-semibold">
                                {(reading.pm25 || 0).toFixed(1)}
                              </TableCell>
                            )}
                            {visibleSensorsTable.includes('pm10') && (
                              <TableCell className="font-semibold">
                                {(reading.pm10 || 0).toFixed(1)}
                              </TableCell>
                            )}
                            {visibleSensorsTable.includes('air_quality') && (
                              <TableCell className="font-semibold">
                                {(reading.air_quality || 0).toFixed(0)}
                              </TableCell>
                            )}
                            <TableCell>
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                                  View JSON
                                </summary>
                                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs overflow-x-auto max-w-2xl">
                                  {reading.rawEvent}
                                </pre>
                              </details>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Flagged Data Section */}
            {flaggedReadings.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/30">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Flagged Data
                  </h2>
                </div>
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Sensor</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Event ID</TableHead>
                          <TableHead className="w-48">Full Event</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flaggedReadings.map((flagged, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">
                              {new Date(flagged.timestamp * 1000).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell className="font-semibold">{flagged.sensor}</TableCell>
                            <TableCell className="text-orange-600 dark:text-orange-400 font-bold">
                              {flagged.value} µg/m³
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                              {flagged.reason}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {flagged.eventId.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 dark:text-blue-400 hover:underline">
                                  View JSON
                                </summary>
                                <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-x-auto">
                                  {flagged.rawEvent}
                                </pre>
                              </details>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Footer info */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4 space-y-1">
              <p>
                Data from{' '}
                <a href="wss://relay.samt.st" className="text-blue-600 dark:text-blue-400 hover:underline">
                  wss://relay.samt.st
                </a>
                {' · '}Kinds <strong>16158</strong> (weather station info) & <strong>4223</strong> (weather station sensor readings)
              </p>
              <p>
                Made by{' '}
                <a
                  href="https://nostr.band/npub1yzfm42rzr3dj2h50flpvdl0uzrv22kv2y4ghve804w5xqu6lzqcqkyfxu5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  npub1yzfm...kyfxu5
                </a>
                {' · '}
                <a href="https://shakespeare.diy" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Vibed with Shakespeare
                </a>
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Index;
