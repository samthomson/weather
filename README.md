# Weather Station

A real-time weather monitoring dashboard that displays temperature, humidity, and PM2.5 air quality data from a Nostr relay.

## Features

- 🌡️ Real-time temperature, humidity, and PM2.5 readings
- 📊 Interactive charts showing last hour and last 24 hours of data
- 🔄 Auto-refresh every 30 seconds
- 🥖🍔 Metric/Imperial unit switching
- 🌓 Dark mode support
- ⚡ Powered by Nostr protocol (Kind 8765)

## Build Your Own Weather Station

Want to build your own IoT weather station and publish data to Nostr?

Check out the hardware and code: **[samthomson/weather-station](https://github.com/samthomson/weather-station)**

## Data Source

- **Relay**: wss://relay.samt.st
- **Kind**: 4223
- **Format**: `Weather: T=25.2C H=63.7% PM2.5=0`

## Tech Stack

- React 18 + TypeScript
- Nostr protocol (Nostrify)
- TailwindCSS + shadcn/ui
- Chart.js
- Vite

## Development

```bash
npm install
npm run dev
```

## Credits

Made by [npub1yzfm...kyfxu5](https://nostr.band/npub1yzfm42rzr3dj2h50flpvdl0uzrv22kv2y4ghve804w5xqu6lzqcqkyfxu5)

Built with [Shakespeare](https://shakespeare.diy)
