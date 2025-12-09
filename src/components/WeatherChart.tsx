import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { WeatherReading } from '@/hooks/useWeatherData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WeatherChartProps {
  data: WeatherReading[];
  units?: 'metric' | 'imperial';
}

export function WeatherChart({ data, units = 'metric' }: WeatherChartProps) {
  if (data.length === 0) {
    return (
      <Card className="col-span-full border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No historical data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Format timestamps for display (show last 24 hours or however many we have)
  const labels = data
    .slice()
    .reverse()
    .map((r) => {
      const date = new Date(r.timestamp * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    });

  // Convert temperature based on units
  const convertTemp = (celsius: number) => {
    if (units === 'imperial') {
      return (celsius * 9/5) + 32;
    }
    return celsius;
  };

  const temperatureData = data.slice().reverse().map((r) => convertTemp(r.temperature));
  const humidityData = data.slice().reverse().map((r) => r.humidity);
  const pm25Data = data.slice().reverse().map((r) => r.pm25);

  const tempUnit = units === 'imperial' ? '°F' : '°C';

  const chartData = {
    labels,
    datasets: [
      {
        label: `Temperature (${tempUnit})`,
        data: temperatureData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(239, 68, 68)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Humidity (%)',
        data: humidityData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(59, 130, 246)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: false,
      },
      {
        label: 'PM2.5 (µg/m³)',
        data: pm25Data,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(168, 85, 247)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          font: {
            size: 12,
            weight: 500,
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 12,
          weight: 600,
        },
        bodyFont: {
          size: 11,
        },
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 11,
          },
          color: 'rgb(100, 116, 139)',
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: 'rgb(100, 116, 139)',
          padding: 8,
        },
      },
    },
  };

  return (
    <Card className="col-span-full border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Historical Data</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-96">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
