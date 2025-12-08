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
}

export function WeatherChart({ data }: WeatherChartProps) {
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

  const temperatureData = data.slice().reverse().map((r) => r.temperature);
  const humidityData = data.slice().reverse().map((r) => r.humidity);
  const pm25Data = data.slice().reverse().map((r) => r.pm25);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: temperatureData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Humidity (%)',
        data: humidityData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      },
      {
        label: 'PM2.5 (µg/m³)',
        data: pm25Data,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(168, 85, 247)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: 'y2',
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
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: 'rgb(239, 68, 68)',
          font: {
            size: 12,
            weight: 600,
          },
        },
        ticks: {
          color: 'rgb(239, 68, 68)',
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Humidity (%)',
          color: 'rgb(59, 130, 246)',
          font: {
            size: 12,
            weight: 600,
          },
        },
        ticks: {
          color: 'rgb(59, 130, 246)',
          font: {
            size: 11,
          },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        offset: true,
        title: {
          display: true,
          text: 'PM2.5 (µg/m³)',
          color: 'rgb(168, 85, 247)',
          font: {
            size: 12,
            weight: 600,
          },
        },
        ticks: {
          color: 'rgb(168, 85, 247)',
          font: {
            size: 11,
          },
        },
        grid: {
          drawOnChartArea: false,
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
