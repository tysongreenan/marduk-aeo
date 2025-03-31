import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  useColorModeValue,
  Center,
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
  Legend
} from 'chart.js';
import { getRankingTrends } from '../api';
import { TrendData, TrendDataPoint } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RankingTrendsProps {
  userId: string;
  days?: number;
}

const RankingTrends: React.FC<RankingTrendsProps> = ({ userId, days = 30 }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setIsLoading(true);
        const response = await getRankingTrends(userId, days);
        const trends = response.trends || [];
        
        setTrendData(trends);
        
        // Select the first keyword by default if available
        if (trends.length > 0 && selectedKeyword === '') {
          setSelectedKeyword(trends[0].keyword);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching ranking trends:', err);
        setError('Failed to load ranking trends. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendData();
  }, [userId, days, selectedKeyword]);
  
  const getSelectedTrendData = () => {
    if (selectedKeyword === '') return null;
    return trendData.find(trend => trend.keyword === selectedKeyword);
  };
  
  const getChartData = () => {
    const selected = getSelectedTrendData();
    
    if (!selected) return null;
    
    return {
      labels: selected.data.map(point => point.date),
      datasets: [
        {
          label: `${selected.keyword} (${selected.brand})`,
          data: selected.data.map(point => point.rank),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
        },
      ],
    };
  };
  
  const getChartOptions = () => {
    return {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Brand Ranking Position Over Time',
        },
      },
      scales: {
        y: {
          reverse: true, // Lower rank numbers are better (1st is better than 10th)
          title: {
            display: true,
            text: 'Rank Position',
          },
          ticks: {
            precision: 0,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
      },
    };
  };
  
  const handleKeywordChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKeyword(e.target.value);
  };
  
  if (isLoading) {
    return (
      <Center py={10}>
        <Spinner size="xl" />
      </Center>
    );
  }
  
  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  
  if (trendData.length === 0) {
    return (
      <Alert status="info">
        <AlertIcon />
        No trend data available. More search data is needed to generate trends.
      </Alert>
    );
  }
  
  const chartData = getChartData();
  
  return (
    <Box p={4} borderRadius="md" boxShadow="sm" bg={cardBg} borderWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={4}>Ranking Trends</Heading>
      
      <Flex mb={4} alignItems="center">
        <Text mr={2} fontWeight="medium">Select Keyword:</Text>
        <Select 
          value={selectedKeyword} 
          onChange={handleKeywordChange}
          maxWidth="300px"
        >
          {trendData.map((trend) => (
            <option key={trend.keyword} value={trend.keyword}>
              {trend.keyword} ({trend.brand})
            </option>
          ))}
        </Select>
      </Flex>
      
      {chartData && (
        <Box height="400px">
          <Line data={chartData} options={getChartOptions()} />
        </Box>
      )}
      
      <Text mt={4} fontSize="sm" color="gray.500">
        Note: Lower ranking positions are better (1st position is the top result)
      </Text>
    </Box>
  );
};

export default RankingTrends; 