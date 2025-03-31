import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  List,
  ListItem,
  ListIcon,
  Flex,
  Badge,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaCheck, FaStar } from 'react-icons/fa';
import { getTopRankingKeywords } from '../api';

interface TopRankingKeywordsProps {
  userId: string;
}

const TopRankingKeywords: React.FC<TopRankingKeywordsProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywordsData, setKeywordsData] = useState<Array<{ 
    keyword: string, 
    rate: number, 
    count: number, 
    total: number 
  }>>([]);
  
  useEffect(() => {
    const fetchKeywordsData = async () => {
      try {
        setIsLoading(true);
        const data = await getTopRankingKeywords();
        setKeywordsData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching top-ranking keywords:', err);
        setError('Failed to load top-ranking keywords. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchKeywordsData();
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
  
  if (keywordsData.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        No keyword data available. Please run queries first.
      </Alert>
    );
  }
  
  const getBadgeColor = (rate: number) => {
    if (rate >= 70) return 'green';
    if (rate >= 50) return 'blue';
    if (rate >= 30) return 'yellow';
    return 'red';
  };
  
  return (
    <Box>
      <Heading size="md" mb={2}>Top-Ranking Keywords</Heading>
      <Text fontSize="sm" mb={4} color="gray.600">
        Keywords with the highest visibility in AI search results
      </Text>
      
      <List spacing={3}>
        {keywordsData.map((item, index) => (
          <ListItem 
            key={index} 
            p={3} 
            borderWidth="1px" 
            borderRadius="md" 
            borderColor={useColorModeValue('gray.200', 'gray.700')}
          >
            <Flex justifyContent="space-between" alignItems="center">
              <Flex alignItems="center">
                <Box 
                  w="24px" 
                  h="24px" 
                  borderRadius="full" 
                  bg={index < 3 ? 'yellow.400' : 'gray.200'} 
                  color={index < 3 ? 'yellow.900' : 'gray.600'} 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  mr={3}
                  fontWeight="bold"
                >
                  {index + 1}
                </Box>
                <Box>
                  <Text fontWeight="medium">{item.keyword}</Text>
                  <Text fontSize="xs" color="gray.500">
                    Appeared in {item.count} of {item.total} searches
                  </Text>
                </Box>
              </Flex>
              
              <Badge colorScheme={getBadgeColor(item.rate)} fontSize="sm" px={2} py={1}>
                {item.rate}%
              </Badge>
            </Flex>
            
            <Box mt={2}>
              <Progress 
                value={item.rate} 
                max={100} 
                size="sm" 
                colorScheme={getBadgeColor(item.rate)}
                borderRadius="full"
              />
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default TopRankingKeywords; 