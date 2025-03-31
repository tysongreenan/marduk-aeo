import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
  Stack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
  Icon,
  Flex,
  useColorModeValue,
  Button,
  Center,
  VStack,
} from '@chakra-ui/react';
import { FaArrowUp, FaArrowDown, FaExclamationTriangle, FaLightbulb, FaCheckCircle } from 'react-icons/fa';
import { getRankingInsights } from '../api';
import { KeywordInsight } from '../types';

interface KeywordInsightsProps {
  userId: string;
  limit?: number;
}

const KeywordInsights: React.FC<KeywordInsightsProps> = ({ userId, limit = 10 }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<KeywordInsight[]>([]);
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        const response = await getRankingInsights(userId, 7); // Use last 7 days
        setInsights(response.insights || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching keyword insights:', err);
        setError('Failed to load keyword insights. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInsights();
  }, [userId, limit]);
  
  const getInsightIcon = (type?: string) => {
    switch (type) {
      case 'opportunity':
        return FaLightbulb;
      case 'warning':
        return FaExclamationTriangle;
      case 'trend':
        return type === 'positive' ? FaArrowUp : FaArrowDown;
      default:
        return FaLightbulb;
    }
  };
  
  const getInsightColor = (type?: string) => {
    switch (type) {
      case 'opportunity':
        return 'yellow.500';
      case 'warning':
        return 'red.500';
      case 'trend':
        return 'blue.500';
      default:
        return 'blue.500';
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Today';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
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
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  
  if (insights.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        No keyword insights available at this time. We'll analyze your ranking data to provide recommendations soon.
      </Alert>
    );
  }
  
  return (
    <Box>
      <Heading size="md" mb={6}>Insights & Recommendations</Heading>
      
      <Text fontSize="md" mb={6} color="gray.600">
        Based on your rankings, here are actionable insights to help improve your brand's visibility in AI search results:
      </Text>
      
      <VStack spacing={5} align="stretch">
        {insights.map((insight, index) => (
          <Card 
            key={insight.id || `insight-${index}`} 
            borderRadius="lg"
            overflow="hidden"
            boxShadow="md"
            borderLeft="4px solid"
            borderLeftColor={getInsightColor(insight.insight_type)}
          >
            <CardHeader bg={useColorModeValue('gray.50', 'gray.700')} py={3}>
              <Flex align="center" justify="space-between">
                <Flex align="center">
                  <Icon 
                    as={getInsightIcon(insight.insight_type)} 
                    color={getInsightColor(insight.insight_type)} 
                    boxSize={5} 
                    mr={3}
                  />
                  <Heading size="sm">{insight.keyword}</Heading>
                </Flex>
                <Badge px={2} py={1} borderRadius="full">
                  {formatDate(insight.created_at)}
                </Badge>
              </Flex>
            </CardHeader>
            
            <CardBody pt={4}>
              <Box mb={4}>
                <Text fontWeight="medium" mb={2}>Insight:</Text>
                <Text>{insight.insight}</Text>
              </Box>
              
              <Divider my={4} />
              
              <Box>
                <Text fontWeight="medium" mb={2}>Recommended Action:</Text>
                <Text color="gray.700" mb={4}>{insight.action}</Text>
                
                <Flex justify="flex-end">
                  <Button 
                    colorScheme="blue" 
                    size="sm" 
                    variant="outline" 
                    rightIcon={<Icon as={FaCheckCircle} />}
                  >
                    Mark as Done
                  </Button>
                </Flex>
              </Box>
            </CardBody>
          </Card>
        ))}
      </VStack>
    </Box>
  );
};

export default KeywordInsights; 