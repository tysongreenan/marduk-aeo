import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
} from '@chakra-ui/react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getSentimentAnalysis } from '../api';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface SentimentAnalysisProps {
  userId: string;
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<{ 
    positive: number, 
    neutral: number, 
    negative: number 
  }>({
    positive: 0,
    neutral: 0,
    negative: 0
  });
  
  useEffect(() => {
    const fetchSentimentData = async () => {
      try {
        setIsLoading(true);
        const data = await getSentimentAnalysis();
        setSentimentData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching sentiment analysis:', err);
        setError('Failed to load sentiment analysis. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSentimentData();
  }, [userId]);
  
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
  
  // Prepare chart data
  const chartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [sentimentData.positive, sentimentData.neutral, sentimentData.negative],
        backgroundColor: [
          'rgba(72, 187, 120, 0.8)',
          'rgba(66, 153, 225, 0.8)',
          'rgba(245, 101, 101, 0.8)',
        ],
        borderColor: [
          'rgba(72, 187, 120, 1)',
          'rgba(66, 153, 225, 1)',
          'rgba(245, 101, 101, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed}%`;
          }
        }
      }
    },
  };
  
  // Get overall sentiment description
  const getOverallSentiment = () => {
    const { positive, neutral, negative } = sentimentData;
    
    if (positive >= 70) return "very positive";
    if (positive >= 50) return "generally positive";
    if (neutral >= 50) return "mostly neutral";
    if (negative >= 50) return "generally negative";
    return "mixed";
  };
  
  return (
    <Box>
      <Heading size="md" mb={2}>Sentiment Analysis</Heading>
      <Text fontSize="sm" mb={6} color="gray.600">
        Sentiment breakdown in AI search results mentioning your brand
      </Text>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {/* Chart */}
        <Box h="240px" display="flex" alignItems="center" justifyContent="center">
          <Pie data={chartData} options={chartOptions} />
        </Box>
        
        {/* Stats */}
        <SimpleGrid columns={3} spacing={4}>
          <Box 
            p={4} 
            borderRadius="md" 
            bg={useColorModeValue('green.50', 'green.900')}
            color={useColorModeValue('green.600', 'green.200')}
          >
            <Stat>
              <StatLabel>Positive</StatLabel>
              <StatNumber>{sentimentData.positive}%</StatNumber>
              <StatHelpText>Favorable mentions</StatHelpText>
            </Stat>
          </Box>
          
          <Box 
            p={4} 
            borderRadius="md" 
            bg={useColorModeValue('blue.50', 'blue.900')}
            color={useColorModeValue('blue.600', 'blue.200')}
          >
            <Stat>
              <StatLabel>Neutral</StatLabel>
              <StatNumber>{sentimentData.neutral}%</StatNumber>
              <StatHelpText>Neutral mentions</StatHelpText>
            </Stat>
          </Box>
          
          <Box 
            p={4} 
            borderRadius="md" 
            bg={useColorModeValue('red.50', 'red.900')}
            color={useColorModeValue('red.600', 'red.200')}
          >
            <Stat>
              <StatLabel>Negative</StatLabel>
              <StatNumber>{sentimentData.negative}%</StatNumber>
              <StatHelpText>Critical mentions</StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>
      </SimpleGrid>
      
      <Alert 
        status={sentimentData.positive >= 50 ? "success" : sentimentData.negative >= 50 ? "error" : "info"}
        mt={6}
        borderRadius="md"
      >
        <AlertIcon />
        AI search results show <strong>{getOverallSentiment()}</strong> sentiment toward your brand.
        {sentimentData.positive > sentimentData.negative 
          ? " Focus on maintaining this positive perception." 
          : " Consider addressing issues to improve brand perception."}
      </Alert>
      
      <Text fontSize="xs" mt={4} color="gray.500">
        Analysis based on sentiment detection across all search results mentioning your brand
      </Text>
    </Box>
  );
};

export default SentimentAnalysis; 