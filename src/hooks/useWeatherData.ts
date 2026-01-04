import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export interface WeatherReading {
  temperature?: number; // Celsius
  humidity?: number; // Percentage
  pm1?: number; // µg/m³
  pm25?: number; // µg/m³
  pm10?: number; // µg/m³
  air_quality?: number; // 0-1000 scale
  pressure?: number; // hPa (hectopascals/millibars)
  light?: number; // lux
  rain?: number; // 0-4095 (0=wet, 4095=dry)
  timestamp: number; // Unix timestamp
  eventId?: string; // Nostr event ID
  rawEvent?: string; // Raw event JSON
  // Sensor models (device names)
  sensorModels?: Record<string, string>; // e.g., { temp: "DHT11", pm25: "PMS5003" }
  // Dynamic sensor data
  [key: string]: number | string | undefined | Record<string, string>;
}

export interface FlaggedReading {
  sensor: 'PM1' | 'PM2.5' | 'PM10' | 'Temperature' | 'Humidity';
  value: number;
  timestamp: number;
  eventId: string;
  rawEvent: string;
  reason: string;
}

export interface WeatherStationMetadata {
  name?: string;
  location?: string; // "lat,lon"
  elevation?: number; // meters
  sensors: string[];
}

export interface DetectedSensors {
  supported: string[]; // Known sensor types we can display
  unsupported: string[]; // Unknown sensor types
  all: string[]; // All sensor types found
}

// Known sensor types we support
const KNOWN_SENSORS = ['temp', 'humidity', 'pm1', 'pm25', 'pm10', 'air_quality', 'pressure', 'light', 'rain'];

// Non-sensor tags to ignore
const IGNORED_TAGS = ['a', 's', 'e', 'p', 'd', 'alt', 'client'];

function parseWeatherTags(tags: string[][]): {
  reading: Partial<WeatherReading>;
  sensorTypes: string[];
} {
  const reading: Partial<WeatherReading> = {};
  const sensorTypes: string[] = [];
  const sensorModels: Record<string, string> = {};

  for (const tag of tags) {
    const [name, value, model] = tag;

    // Skip non-sensor tags
    if (IGNORED_TAGS.includes(name)) continue;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) continue;

    // Track all sensor types found
    sensorTypes.push(name);

    // Store sensor model if provided (3rd parameter)
    if (model) {
      sensorModels[name] = model;
    }

    // Parse known sensors
    switch (name) {
      case 'temp':
        reading.temperature = numValue;
        break;
      case 'humidity':
        reading.humidity = numValue;
        break;
      case 'pm1':
        reading.pm1 = numValue;
        break;
      case 'pm25':
        reading.pm25 = numValue;
        break;
      case 'pm10':
        reading.pm10 = numValue;
        break;
      case 'air_quality':
        reading.air_quality = numValue;
        break;
      case 'pressure':
        reading.pressure = numValue;
        break;
      case 'light':
        reading.light = numValue;
        break;
      case 'rain':
        reading.rain = numValue;
        break;
      default:
        // Store unknown sensors in dynamic properties
        reading[name] = numValue;
    }
  }

  reading.sensorModels = sensorModels;

  return { reading, sensorTypes };
}

function parseStationMetadata(tags: string[][]): WeatherStationMetadata {
  const nameTag = tags.find(([name]) => name === 'name');
  const locationTag = tags.find(([name]) => name === 'location');
  const elevationTag = tags.find(([name]) => name === 'elevation');
  const sensorTags = tags.filter(([name]) => name === 'sensor');

  return {
    name: nameTag?.[1],
    location: locationTag?.[1],
    elevation: elevationTag ? parseFloat(elevationTag[1]) : undefined,
    sensors: sensorTags.map(([, sensor]) => sensor),
  };
}

export function useWeatherData(relayUrl: string, authorPubkey: string) {
  const { nostr } = useNostr();

  return useQuery<{
    readings: WeatherReading[];
    flaggedReadings: FlaggedReading[];
    stationMetadata?: WeatherStationMetadata;
    detectedSensors: DetectedSensors;
  }>({
    queryKey: ['weatherData', relayUrl, authorPubkey],
    queryFn: async (c) => {
      try {
        const relay = nostr.relay(relayUrl);
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

        const now = Math.floor(Date.now() / 1000);
        const oneHour = 3600; // 1 hour in seconds

        const queries = [];

        // Get station metadata (kind 16158 - replaceable)
        queries.push({
          kinds: [16158],
          authors: [authorPubkey],
          limit: 1,
        });

        // First, get all events from the last hour for detailed recent data
        queries.push({
          kinds: [4223],
          authors: [authorPubkey],
          since: now - oneHour,
          limit: 200, // Get plenty of recent readings
        });

        // Then get one reading per hour for hours 1-24 (23 queries)
        for (let i = 1; i < 24; i++) {
          const windowEnd = now - (i * oneHour);
          const windowStart = windowEnd - oneHour;

          queries.push({
            kinds: [4223],
            authors: [authorPubkey],
            since: windowStart,
            until: windowEnd,
            limit: 1,
          });
        }

        // Single request with all filters - relay processes them together
        const events = await relay.query(queries, { signal });

        // Separate metadata and reading events
        const metadataEvent = events.find(e => e.kind === 16158);
        const readingEvents = events.filter(e => e.kind === 4223);

        // Parse station metadata
        let stationMetadata: WeatherStationMetadata | undefined;
        if (metadataEvent) {
          stationMetadata = parseStationMetadata(metadataEvent.tags);
        }

        // Sort readings by timestamp descending (most recent first)
        const sorted = readingEvents.sort((a, b) => b.created_at - a.created_at);

        // Parse all reading events and deduplicate
        const readings: WeatherReading[] = [];
        const flaggedReadings: FlaggedReading[] = [];
        const seenTimestamps = new Set<number>();
        const allSensorTypes = new Set<string>();
        let previousPM1: number | null = null;
        let previousPM25: number | null = null;
        let previousPM10: number | null = null;

        for (const event of sorted) {
          if (!seenTimestamps.has(event.created_at)) {
            const { reading: parsed, sensorTypes } = parseWeatherTags(event.tags);

            // Track all sensor types encountered
            sensorTypes.forEach(s => allSensorTypes.add(s));

            if (parsed && Object.keys(parsed).length > 0) {
              let pm1Value = parsed.pm1 || 0;
              let pm25Value = parsed.pm25 || 0;
              let pm10Value = parsed.pm10 || 0;

              // Check PM1 for anomalies
              if (previousPM1 !== null && previousPM1 > 0 && pm1Value > previousPM1 * 5) {
                flaggedReadings.push({
                  sensor: 'PM1',
                  value: pm1Value,
                  timestamp: event.created_at,
                  eventId: event.id,
                  rawEvent: JSON.stringify(event, null, 2),
                  reason: `Value is ${(pm1Value / previousPM1).toFixed(1)}x previous reading (${previousPM1.toFixed(1)} µg/m³)`,
                });
                pm1Value = 0; // Will be treated as null in charts
              }

              // Check PM2.5 for anomalies
              if (previousPM25 !== null && previousPM25 > 0 && pm25Value > previousPM25 * 5) {
                flaggedReadings.push({
                  sensor: 'PM2.5',
                  value: pm25Value,
                  timestamp: event.created_at,
                  eventId: event.id,
                  rawEvent: JSON.stringify(event, null, 2),
                  reason: `Value is ${(pm25Value / previousPM25).toFixed(1)}x previous reading (${previousPM25.toFixed(1)} µg/m³)`,
                });
                pm25Value = 0; // Will be treated as null in charts
              }

              // Check PM10 for anomalies
              if (previousPM10 !== null && previousPM10 > 0 && pm10Value > previousPM10 * 5) {
                flaggedReadings.push({
                  sensor: 'PM10',
                  value: pm10Value,
                  timestamp: event.created_at,
                  eventId: event.id,
                  rawEvent: JSON.stringify(event, null, 2),
                  reason: `Value is ${(pm10Value / previousPM10).toFixed(1)}x previous reading (${previousPM10.toFixed(1)} µg/m³)`,
                });
                pm10Value = 0; // Will be treated as null in charts
              }

              readings.push({
                ...parsed, // Include all dynamic sensor data
                temperature: parsed.temperature,
                humidity: parsed.humidity,
                pm1: pm1Value,
                pm25: pm25Value,
                pm10: pm10Value,
                timestamp: event.created_at,
                eventId: event.id,
                rawEvent: JSON.stringify(event, null, 2),
              });

              // Update previous values only if valid (not flagged and > 0)
              if (pm1Value > 0) previousPM1 = pm1Value;
              if (pm25Value > 0) previousPM25 = pm25Value;
              if (pm10Value > 0) previousPM10 = pm10Value;

              seenTimestamps.add(event.created_at);
            }
          }
        }

        // Categorize detected sensors
        const supportedSensors = Array.from(allSensorTypes).filter(s => KNOWN_SENSORS.includes(s));
        const unsupportedSensors = Array.from(allSensorTypes).filter(s => !KNOWN_SENSORS.includes(s));

        const detectedSensors: DetectedSensors = {
          supported: supportedSensors,
          unsupported: unsupportedSensors,
          all: Array.from(allSensorTypes),
        };

        return { readings, flaggedReadings, stationMetadata, detectedSensors };
      } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
}
