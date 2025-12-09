import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export interface WeatherReading {
  temperature: number; // Celsius
  humidity: number; // Percentage
  pm25: number; // µg/m³
  timestamp: number; // Unix timestamp
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

  return useQuery({
    queryKey: ['weatherData', relayUrl, authorPubkey],
    queryFn: async (c) => {
      try {
        const relay = nostr.relay(relayUrl);
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

        const now = Math.floor(Date.now() / 1000);

        // Create time windows - sample every 5 minutes for 24 hours = 288 queries
        // This is more efficient than getting thousands of events every 30 seconds
        const queries = [];
        const fiveMinutes = 300; // 5 minutes in seconds

        // Get one reading per 5-minute interval over the last 24 hours
        for (let i = 0; i < 288; i++) {
          const windowEnd = now - (i * fiveMinutes);
          const windowStart = windowEnd - fiveMinutes;

          queries.push({
            kinds: [8765],
            authors: [authorPubkey],
            since: windowStart,
            until: windowEnd,
            limit: 1,
          });
        }

        // Query all time windows in one request
        const events = await relay.query(queries, { signal });

        // Sort by timestamp descending (most recent first)
        const sorted = events.sort((a, b) => b.created_at - a.created_at);

        // Parse all events and remove duplicates
        const readings: WeatherReading[] = [];
        const seenTimestamps = new Set<number>();

        for (const event of sorted) {
          if (!seenTimestamps.has(event.created_at)) {
            const parsed = parseWeatherContent(event.content);
            if (parsed) {
              readings.push({
                temperature: parsed.temperature!,
                humidity: parsed.humidity!,
                pm25: parsed.pm25!,
                timestamp: event.created_at,
              });
              seenTimestamps.add(event.created_at);
            }
          }
        }

        return readings;
      } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
}
