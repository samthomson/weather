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
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

        // Query kind 8765 events from the specific author, limit to 100
        const events = await relay.query(
          [
            {
              kinds: [8765],
              authors: [authorPubkey],
              limit: 100,
            },
          ],
          { signal }
        );

        // Sort by timestamp descending (most recent first)
        const sorted = events.sort((a, b) => b.created_at - a.created_at);

        // Parse all events
        const readings: WeatherReading[] = [];
        for (const event of sorted) {
          const parsed = parseWeatherContent(event.content);
          if (parsed) {
            readings.push({
              temperature: parsed.temperature!,
              humidity: parsed.humidity!,
              pm25: parsed.pm25!,
              timestamp: event.created_at,
            });
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
