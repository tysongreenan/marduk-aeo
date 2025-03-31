import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { getDetailedInsights } from '../api';

interface DetailedInsightsProps {
  userId: string;
}

const DetailedInsights: React.FC<DetailedInsightsProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<Array<{ 
    metric: string, 
    score: number, 
    recommendation: string 
  }>>([]);
  
  useEffect(() => {
    const fetchInsightsData = async () => {
      try {
        setIsLoading(true);
        const data = await getDetailedInsights();
        setInsightsData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching detailed insights:', err);
        setError('Failed to load detailed insights. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInsightsData();
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
  
  if (insightsData.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        No detailed insights available. Please run queries first.
      </Alert>
    );
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };
  
  const getScoreText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };
  
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  
  return (
    <Box>
      <Heading size="md" mb={2}>Performance Insights</Heading>
      <Text fontSize="sm" mb={4} color="gray.600">
        Detailed analysis of your brand's performance in AI search
      </Text>
      
      <Table variant="simple" size="sm">
        <Thead bg={headerBg}>
          <Tr>
            <Th>Metric</Th>
            <Th>Score</Th>
            <Th>Status</Th>
            <Th>Recommendation</Th>
          </Tr>
        </Thead>
        <Tbody>
          {insightsData.map((item, index) => (
            <Tr key={index}>
              <Td fontWeight="medium">{item.metric}</Td>
              <Td>
                <Badge colorScheme={getScoreColor(item.score)}>
                  {item.score}/100
                </Badge>
              </Td>
              <Td>
                <Box w="100%">
                  <Progress 
                    value={item.score} 
                    max={100} 
                    size="sm" 
                    colorScheme={getScoreColor(item.score)}
                    borderRadius="full"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {getScoreText(item.score)}
                  </Text>
                </Box>
              </Td>
              <Td fontSize="sm">{item.recommendation}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      
      <Text fontSize="xs" mt={4} color="gray.500">
        Analysis based on AI evaluation of your brand's content and visibility
      </Text>
    </Box>
  );
};

export default DetailedInsights; 