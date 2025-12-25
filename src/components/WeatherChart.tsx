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
  title: string;
}

export function WeatherChart({ data, units = 'metric', title }: WeatherChartProps) {
  if (data.length === 0) {
    return (
      <Card className="col-span-full border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No historical data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Convert temperature based on units
  const convertTemp = (celsius: number) => {
    if (units === 'imperial') {
      return (celsius * 9/5) + 32;
    }
    return celsius;
  };

  const tempUnit = units === 'imperial' ? '°F' : '°C';

  // Check if this is the 24-hour chart
  const is24HourChart = title === 'Last 24 Hours';
  const isLastHourChart = title === 'Last Hour';

  let labels: string[];
  let temperatureData: (number | null)[];
  let humidityData: (number | null)[];
  let pm1Data: (number | null)[];
  let pm25Data: (number | null)[];
  let pm10Data: (number | null)[];

  if (is24HourChart) {
    // For 24-hour chart: create exactly 24 hourly time slots
    const now = Math.floor(Date.now() / 1000);
    const oneHour = 3600;

    // Create 24 hourly time slots from 23 hours ago to now
    const timeSlots: number[] = [];
    for (let i = 23; i >= 0; i--) {
      timeSlots.push(now - (i * oneHour));
    }

    // Create labels
    labels = timeSlots.map(ts => {
      const date = new Date(ts * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    });

    // Map data to time slots, using null for missing data
    temperatureData = timeSlots.map(ts => {
      // Find reading within ±30 minutes of this time slot
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 1800);
      return reading ? convertTemp(reading.temperature) : null;
    });

    humidityData = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 1800);
      return reading ? reading.humidity : null;
    });

    pm1Data = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 1800);
      return reading ? (reading.pm1 === 0 ? null : reading.pm1) : null;
    });

    pm25Data = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 1800);
      return reading ? (reading.pm25 === 0 ? null : reading.pm25) : null;
    });

    pm10Data = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 1800);
      return reading ? (reading.pm10 === 0 ? null : reading.pm10) : null;
    });
  } else if (isLastHourChart) {
    // For last hour chart: create 1-minute interval time slots (60 slots for 1 hour)
    const now = Math.floor(Date.now() / 1000);
    const oneMinute = 60; // 1 minute in seconds

    // Create 60 time slots (1-minute intervals over 1 hour)
    const timeSlots: number[] = [];
    for (let i = 59; i >= 0; i--) {
      timeSlots.push(now - (i * oneMinute));
    }

    // Create labels
    labels = timeSlots.map(ts => {
      const date = new Date(ts * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    });

    // Map data to time slots, using null for missing data
    temperatureData = timeSlots.map(ts => {
      // Find reading within ±30 seconds of this time slot
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 30);
      return reading ? convertTemp(reading.temperature) : null;
    });

    humidityData = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 30);
      return reading ? reading.humidity : null;
    });

    pm1Data = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 30);
      return reading ? (reading.pm1 === 0 ? null : reading.pm1) : null;
    });

    pm25Data = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 30);
      return reading ? (reading.pm25 === 0 ? null : reading.pm25) : null;
    });

    pm10Data = timeSlots.map(ts => {
      const reading = data.find(r => Math.abs(r.timestamp - ts) < 30);
      return reading ? (reading.pm10 === 0 ? null : reading.pm10) : null;
    });
  } else {
    // Fallback: use all data points as-is
    const reversedData = data.slice().reverse();

    labels = reversedData.map((r) => {
      const date = new Date(r.timestamp * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    });

    temperatureData = reversedData.map((r) => convertTemp(r.temperature));
    humidityData = reversedData.map((r) => r.humidity);
    pm1Data = reversedData.map((r) => r.pm1 === 0 ? null : r.pm1);
    pm25Data = reversedData.map((r) => r.pm25 === 0 ? null : r.pm25);
    pm10Data = reversedData.map((r) => r.pm10 === 0 ? null : r.pm10);
  }

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
        spanGaps: false, // Don't connect points across null values
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
        spanGaps: false, // Don't connect points across null values
      },
      {
        label: 'PM1 (µg/m³)',
        data: pm1Data,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(139, 92, 246)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: false,
        spanGaps: false,
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
        spanGaps: false,
      },
      {
        label: 'PM10 (µg/m³)',
        data: pm10Data,
        borderColor: 'rgb(192, 132, 252)',
        backgroundColor: 'rgba(192, 132, 252, 0.05)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(192, 132, 252)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: false,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
    <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 w-full">
      <CardHeader className="pb-6 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="w-full h-80">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
