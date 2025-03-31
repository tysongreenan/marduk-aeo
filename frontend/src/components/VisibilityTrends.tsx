import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  ChartOptions
} from 'chart.js';
import { getVisibilityTrends } from '../api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface VisibilityTrendsProps {
  userId: string;
}

const VisibilityTrends: React.FC<VisibilityTrendsProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendsData, setTrendsData] = useState<{ dates: string[], rates: number[] }>({ 
    dates: [], 
    rates: [] 
  });
  
  // Colors
  const lineColor = useColorModeValue('rgba(49, 130, 206, 1)', 'rgba(99, 179, 237, 1)');
  const bgColor = useColorModeValue('rgba(49, 130, 206, 0.1)', 'rgba(99, 179, 237, 0.1)');
  
  useEffect(() => {
    const fetchTrendsData = async () => {
      try {
        setIsLoading(true);
        const data = await getVisibilityTrends();
        setTrendsData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching visibility trends:', err);
        setError('Failed to load visibility trends. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrendsData();
  }, [userId]);
  
  // Format dates to be more readable
  const formatDates = (dates: string[]) => {
    return dates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
  };
  
  const chartData = {
    labels: formatDates(trendsData.dates),
    datasets: [
      {
        label: 'Visibility Rate (%)',
        data: trendsData.rates,
        fill: true,
        backgroundColor: bgColor,
        borderColor: lineColor,
        tension: 0.4,
      },
    ],
  };
  
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Visibility: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };
  
  if (isLoading) {
    return (
      <Center py={8}>
        <Spinner size="xl" />
      </Center>
    );
  }
  
  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  
  // Calculate average visibility
  const averageVisibility = trendsData.rates.length > 0 
    ? Math.round(trendsData.rates.reduce((sum, rate) => sum + rate, 0) / trendsData.rates.length) 
    : 0;
    
  // Calculate trend (increasing or decreasing)
  const calculateTrend = () => {
    if (trendsData.rates.length < 7) return "stable";
    
    const recent = trendsData.rates.slice(0, 7).reduce((sum, rate) => sum + rate, 0) / 7;
    const previous = trendsData.rates.slice(7, 14).reduce((sum, rate) => sum + rate, 0) / 7;
    
    if (recent > previous * 1.05) return "increasing";
    if (recent < previous * 0.95) return "decreasing";
    return "stable";
  };
  
  const trend = calculateTrend();
  
  return (
    <Box>
      <Heading size="md" mb={2}>Brand Visibility Trends</Heading>
      <Text fontSize="sm" mb={4} color="gray.600">
        {trend === "increasing" ? 
          `Your brand visibility is trending upward with a ${averageVisibility}% average appearance rate.` :
        trend === "decreasing" ? 
          `Your brand visibility is trending downward with a ${averageVisibility}% average appearance rate.` :
          `Your brand visibility is stable with a ${averageVisibility}% average appearance rate.`}
      </Text>
      
      <Box h="300px">
        <Line data={chartData} options={chartOptions} />
      </Box>
      
      <Text fontSize="xs" mt={2} color="gray.500" textAlign="right">
        Last 30 days of data
      </Text>
    </Box>
  );
};

export default VisibilityTrends; 