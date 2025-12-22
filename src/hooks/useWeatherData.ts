import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export interface WeatherReading {
  temperature: number; // Celsius
  humidity: number; // Percentage
  pm25: number; // µg/m³
  timestamp: number; // Unix timestamp
  eventId?: string; // Nostr event ID
  rawContent?: string; // Raw event content
}

export interface FlaggedReading {
  sensor: 'PM2.5' | 'Temperature' | 'Humidity';
  value: number;
  timestamp: number;
  eventId: string;
  rawContent: string;
  reason: string;
}

function parseWeatherContent(content: string): Partial<WeatherReading> | null {
  try {
    // Parse format: "Weather: T=25.2C H=63.7% PM2.5=0"
    const tempMatch = content.match(/T=([\d.]+)C/);
    const humidityMatch = content.match(/H=([\d.]+)%/);
    const pm25Match = content.match(/PM2\.5=([\d.]+)/);

    if (!tempMatch || !humidityMatch || !pm25Match) {
      return null;
    }

    return {
      temperature: parseFloat(tempMatch[1]),
      humidity: parseFloat(humidityMatch[1]),
      pm25: parseFloat(pm25Match[1]),
    };
  } catch {
    return null;
  }
}

export function useWeatherData(relayUrl: string, authorPubkey: string) {
  const { nostr } = useNostr();

  return useQuery<{ readings: WeatherReading[]; flaggedReadings: FlaggedReading[] }>({
    queryKey: ['weatherData', relayUrl, authorPubkey],
    queryFn: async (c) => {
      try {
        const relay = nostr.relay(relayUrl);
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

        const now = Math.floor(Date.now() / 1000);
        const oneHour = 3600; // 1 hour in seconds

        const queries = [];

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

        // Sort by timestamp descending (most recent first)
        const sorted = events.sort((a, b) => b.created_at - a.created_at);

        // Parse all events and deduplicate
        const readings: WeatherReading[] = [];
        const flaggedReadings: FlaggedReading[] = [];
        const seenTimestamps = new Set<number>();
        let previousPM25: number | null = null;

        for (const event of sorted) {
          if (!seenTimestamps.has(event.created_at)) {
            const parsed = parseWeatherContent(event.content);
            if (parsed) {
              let pm25Value = parsed.pm25!;
              let isFlagged = false;

              // Check if PM2.5 is more than 5x the previous valid value
              // Only flag if previous PM2.5 was valid (not 0)
              if (previousPM25 !== null && previousPM25 > 0 && pm25Value > previousPM25 * 5) {
                flaggedReadings.push({
                  sensor: 'PM2.5',
                  value: pm25Value,
                  timestamp: event.created_at,
                  eventId: event.id,
                  rawContent: event.content,
                  reason: `Value is ${(pm25Value / previousPM25).toFixed(1)}x previous reading (${previousPM25.toFixed(1)} µg/m³)`,
                });
                isFlagged = true;
                pm25Value = 0; // Will be treated as null in charts
              }

              readings.push({
                temperature: parsed.temperature!,
                humidity: parsed.humidity!,
                pm25: pm25Value,
                timestamp: event.created_at,
                eventId: event.id,
                rawContent: event.content,
              });

              // Update previous PM2.5 only if:
              // 1. Not flagged as erroneous
              // 2. Value is greater than 0 (valid reading)
              if (!isFlagged && pm25Value > 0) {
                previousPM25 = pm25Value;
              }

              seenTimestamps.add(event.created_at);
            }
          }
        }

        return { readings, flaggedReadings };
      } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
}
