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
import { getSentimentTrends } from '../api';

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

interface SentimentTrendsProps {
  userId: string;
}

const SentimentTrends: React.FC<SentimentTrendsProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendsData, setTrendsData] = useState<{ dates: string[], positiveRates: number[] }>({ 
    dates: [], 
    positiveRates: [] 
  });
  
  // Colors
  const lineColor = useColorModeValue('rgba(72, 187, 120, 1)', 'rgba(104, 211, 145, 1)');
  const bgColor = useColorModeValue('rgba(72, 187, 120, 0.1)', 'rgba(104, 211, 145, 0.1)');
  
  useEffect(() => {
    const fetchTrendsData = async () => {
      try {
        setIsLoading(true);
        const data = await getSentimentTrends();
        setTrendsData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching sentiment trends:', err);
        setError('Failed to load sentiment trends. Please try again later.');
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
        label: 'Positive Sentiment (%)',
        data: trendsData.positiveRates,
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
            return `Positive Sentiment: ${context.parsed.y}%`;
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
  
  // Calculate average sentiment
  const averageSentiment = trendsData.positiveRates.length > 0 
    ? Math.round(trendsData.positiveRates.reduce((sum, rate) => sum + rate, 0) / trendsData.positiveRates.length) 
    : 0;
    
  // Calculate trend (increasing or decreasing)
  const calculateTrend = () => {
    if (trendsData.positiveRates.length < 7) return "stable";
    
    const recent = trendsData.positiveRates.slice(0, 7).reduce((sum, rate) => sum + rate, 0) / 7;
    const previous = trendsData.positiveRates.slice(7, 14).reduce((sum, rate) => sum + rate, 0) / 7;
    
    if (recent > previous * 1.05) return "improving";
    if (recent < previous * 0.95) return "declining";
    return "stable";
  };
  
  const trend = calculateTrend();
  
  // Get sentiment status text
  const getSentimentStatus = () => {
    if (averageSentiment >= 70) return "very positive";
    if (averageSentiment >= 60) return "positive";
    if (averageSentiment >= 50) return "somewhat positive";
    if (averageSentiment >= 40) return "neutral";
    if (averageSentiment >= 30) return "somewhat negative";
    return "negative";
  };
  
  return (
    <Box>
      <Heading size="md" mb={2}>Sentiment Analysis Trends</Heading>
      <Text fontSize="sm" mb={4} color="gray.600">
        {trend === "improving" ? 
          `Brand sentiment is improving with a ${averageSentiment}% positive rate (${getSentimentStatus()}).` :
         trend === "declining" ? 
          `Brand sentiment is declining with a ${averageSentiment}% positive rate (${getSentimentStatus()}).` :
          `Brand sentiment is stable with a ${averageSentiment}% positive rate (${getSentimentStatus()}).`}
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

export default SentimentTrends; 