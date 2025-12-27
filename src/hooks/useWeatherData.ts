import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export interface WeatherReading {
  temperature: number; // Celsius
  humidity: number; // Percentage
  pm1: number; // µg/m³
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  timestamp: number; // Unix timestamp
  eventId?: string; // Nostr event ID
  rawEvent?: string; // Raw event JSON
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

function parseWeatherTags(tags: string[][]): Partial<WeatherReading> | null {
  try {
    const tempTag = tags.find(([name]) => name === 'temp');
    const humidityTag = tags.find(([name]) => name === 'humidity');
    const pm1Tag = tags.find(([name]) => name === 'pm1');
    const pm25Tag = tags.find(([name]) => name === 'pm25');
    const pm10Tag = tags.find(([name]) => name === 'pm10');

    // Require at least temp and humidity
    if (!tempTag || !humidityTag) {
      return null;
    }

    return {
      temperature: parseFloat(tempTag[1]),
      humidity: parseFloat(humidityTag[1]),
      pm1: pm1Tag ? parseFloat(pm1Tag[1]) : 0,
      pm25: pm25Tag ? parseFloat(pm25Tag[1]) : 0,
      pm10: pm10Tag ? parseFloat(pm10Tag[1]) : 0,
    };
  } catch {
    return null;
  }
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
        let previousPM1: number | null = null;
        let previousPM25: number | null = null;
        let previousPM10: number | null = null;

        for (const event of sorted) {
          if (!seenTimestamps.has(event.created_at)) {
            const parsed = parseWeatherTags(event.tags);
            if (parsed) {
              let pm1Value = parsed.pm1!;
              let pm25Value = parsed.pm25!;
              let pm10Value = parsed.pm10!;

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
                temperature: parsed.temperature!,
                humidity: parsed.humidity!,
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

        return { readings, flaggedReadings, stationMetadata };
      } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
}
