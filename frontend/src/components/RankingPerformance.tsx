import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Center,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  AlertIcon,
  Alert,
  Progress,
  SimpleGrid,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { getRankingPerformance } from '../api';

interface RankingPerformanceProps {
  userId: string;
  days: number;
}

const RankingPerformance: React.FC<RankingPerformanceProps> = ({ userId, days }) => {
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Computed metrics
  const totalSearches = rankingData.reduce((sum, item) => sum + item.searches, 0);
  const totalAppearances = rankingData.reduce((sum, item) => sum + item.appearances, 0);
  const averagePercentage = totalSearches > 0 
    ? Math.round((totalAppearances / totalSearches) * 100) 
    : 0;
  const keywordsInTop3 = rankingData.filter(item => item.position && item.position <= 3).length;
  const totalPotentialImpressions = rankingData.reduce((sum, item) => sum + item.potential_impressions, 0);
  
  useEffect(() => {
    const fetchRankingData = async () => {
      try {
        setIsLoading(true);
        const result = await getRankingPerformance(userId, days);
        setRankingData(result.keywords || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching ranking data:', err);
        setError('Failed to load ranking data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRankingData();
  }, [userId, days]);

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

  if (rankingData.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        No ranking data available. Make sure your brand has keywords set up and some searches have been performed.
      </Alert>
    );
  }

  return (
    <Box>
      <Heading size="md" mb={4}>Ranking Performance</Heading>
      
      {/* Summary stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Average Visibility</StatLabel>
              <StatNumber>{averagePercentage}%</StatNumber>
              <StatHelpText>
                Appearance rate in AI results
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Keywords in Top 3</StatLabel>
              <StatNumber>{keywordsInTop3}</StatNumber>
              <StatHelpText>
                Out of {rankingData.length} total keywords
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Keywords Monitored</StatLabel>
              <StatNumber>{rankingData.length}</StatNumber>
              <StatHelpText>
                Active keywords being tracked
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Potential Impressions</StatLabel>
              <StatNumber>{totalPotentialImpressions.toLocaleString()}</StatNumber>
              <StatHelpText>
                Estimated monthly exposure
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>
      
      {/* Keywords data table */}
      <Box overflowX="auto">
        <Table variant="simple" mt={4}>
          <Thead>
            <Tr>
              <Th>Keyword</Th>
              <Th isNumeric>Searches</Th>
              <Th isNumeric>Appearances</Th>
              <Th isNumeric>Rate</Th>
              <Th isNumeric>Position</Th>
              <Th isNumeric>Potential Impressions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rankingData.map((item, index) => (
              <Tr key={index}>
                <Td fontWeight="medium">{item.keyword}</Td>
                <Td isNumeric>{item.searches}</Td>
                <Td isNumeric>{item.appearances}</Td>
                <Td isNumeric>
                  <Badge colorScheme={item.percentage > 50 ? 'green' : item.percentage > 20 ? 'yellow' : 'red'}>
                    {item.percentage}%
                  </Badge>
                </Td>
                <Td isNumeric>
                  {item.position ? 
                    <Badge colorScheme={item.position <= 3 ? 'green' : 'blue'}>
                      #{item.position}
                    </Badge> 
                    : '–'}
                </Td>
                <Td isNumeric>{item.potential_impressions.toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      
      <Text fontSize="sm" color="gray.500" mt={4} textAlign="center">
        Data from the last {days} days
      </Text>
    </Box>
  );
};

export default RankingPerformance; 