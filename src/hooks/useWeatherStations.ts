import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export interface WeatherStation {
  pubkey: string;
  name: string;
  location?: string;
  elevation?: number;
  sensors: string[];
}

export function useWeatherStations(relayUrl: string) {
  const { nostr } = useNostr();

  return useQuery<WeatherStation[]>({
    queryKey: ['weatherStations', relayUrl],
    queryFn: async (c) => {
      try {
        const relay = nostr.relay(relayUrl);
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

        // Query all kind 16158 metadata events
        const events = await relay.query(
          [
            {
              kinds: [16158],
              limit: 50, // Get up to 50 stations
            },
          ],
          { signal }
        );

        // Parse station metadata
        const stations: WeatherStation[] = events.map(event => {
          const nameTag = event.tags.find(([name]) => name === 'name');
          const locationTag = event.tags.find(([name]) => name === 'location');
          const elevationTag = event.tags.find(([name]) => name === 'elevation');
          const sensorTags = event.tags.filter(([name]) => name === 'sensor');

          return {
            pubkey: event.pubkey,
            name: nameTag?.[1] || `Station ${event.pubkey.substring(0, 8)}`,
            location: locationTag?.[1],
            elevation: elevationTag ? parseFloat(elevationTag[1]) : undefined,
            sensors: sensorTags.map(([, sensor]) => sensor),
          };
        });

        return stations;
      } catch (error) {
        console.error('Error fetching weather stations:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 60000, // 1 minute
  });
}
