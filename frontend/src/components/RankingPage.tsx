import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Divider,
  useColorModeValue,
  SimpleGrid,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { FaPlay, FaSync } from 'react-icons/fa';
import { runQueriesManually } from '../api';
import RankingPerformance from './RankingPerformance';
import RankingAlerts from './RankingAlerts';
import KeywordInsights from './KeywordInsights';
import VisibilityTrends from './VisibilityTrends';
import SentimentTrends from './SentimentTrends';
import LlmVisibility from './LlmVisibility';
import TopRankingKeywords from './TopRankingKeywords';
import AviAssessment from './AviAssessment';
import DetailedInsights from './DetailedInsights';
import CompetitorAnalysis from './CompetitorAnalysis';
import SentimentAnalysis from './SentimentAnalysis';
import EntityRecognition from './EntityRecognition';
import ReportGenerator from './ReportGenerator';

interface RankingPageProps {
  userId: string;
}

const RankingPage: React.FC<RankingPageProps> = ({ userId }) => {
  const [isRunningQueries, setIsRunningQueries] = useState(false);
  const [lastQueriesRun, setLastQueriesRun] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('Your Brand');
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  useEffect(() => {
    // Get the brand name from localStorage
    const brands = JSON.parse(localStorage.getItem('mockBrands') || '[]');
    if (brands.length > 0) {
      const latestBrand = brands[brands.length - 1];
      setBrandName(latestBrand.brand_name);
    }
    
    // Check if queries were run recently
    const lastRun = localStorage.getItem('lastQueriesRun');
    if (lastRun) {
      setLastQueriesRun(lastRun);
    }
  }, []);
  
  const handleRunQueries = async () => {
    setIsRunningQueries(true);
    
    try {
      const result = await runQueriesManually();
      
      if (result.success) {
        toast({
          title: 'Queries Completed',
          description: result.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Update the last run time
        const lastRun = localStorage.getItem('lastQueriesRun');
        if (lastRun) {
          setLastQueriesRun(lastRun);
        }
      } else {
        toast({
          title: 'Query Error',
          description: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('Error running queries:', err);
      toast({
        title: 'Error',
        description: 'An error occurred while running queries',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRunningQueries(false);
    }
  };
  
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };
  
  return (
    <Box>
      <Flex 
        p={4} 
        bg={bgColor} 
        borderWidth="1px" 
        borderRadius="md" 
        borderColor={borderColor}
        mb={6}
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={4}
      >
        <Box>
          <Heading size="md">{brandName} Rankings</Heading>
          {lastQueriesRun && (
            <Text fontSize="sm" color="gray.500">
              Last updated: {formatDateTime(lastQueriesRun)}
            </Text>
          )}
        </Box>
        
        <Flex gap={4}>
          <Button
            colorScheme="blue"
            onClick={handleRunQueries}
            isLoading={isRunningQueries}
            loadingText="Running..."
          >
            Run Queries Now
          </Button>
          
          <ReportGenerator brandName={brandName} />
        </Flex>
      </Flex>
      
      <Tabs isFitted variant="enclosed">
        <TabList mb="1em">
          <Tab>Performance</Tab>
          <Tab>Trends</Tab>
          <Tab>LLM Analysis</Tab>
          <Tab>Insights</Tab>
          <Tab>Competitors</Tab>
        </TabList>
        
        <TabPanels>
          {/* Performance Tab */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <RankingPerformance userId={userId} days={30} />
              </Box>
              
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <AviAssessment userId={userId} />
              </Box>
            </SimpleGrid>
            
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mt={6}>
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <TopRankingKeywords userId={userId} />
              </Box>
              
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <RankingAlerts userId={userId} days={7} />
              </Box>
            </SimpleGrid>
          </TabPanel>
          
          {/* Trends Tab */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <VisibilityTrends userId={userId} />
              </Box>
              
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <SentimentTrends userId={userId} />
              </Box>
            </SimpleGrid>
          </TabPanel>
          
          {/* LLM Analysis Tab */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <LlmVisibility userId={userId} />
              </Box>
              
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <SentimentAnalysis userId={userId} />
              </Box>
            </SimpleGrid>
            
            <Box 
              p={5}
              borderWidth="1px"
              borderRadius="lg"
              borderColor={borderColor}
              mt={6}
            >
              <EntityRecognition userId={userId} />
            </Box>
          </TabPanel>
          
          {/* Insights Tab */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, lg: 1 }} spacing={6}>
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <DetailedInsights userId={userId} />
              </Box>
              
              <Box 
                p={5}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={borderColor}
              >
                <KeywordInsights userId={userId} />
              </Box>
            </SimpleGrid>
          </TabPanel>
          
          {/* Competitors Tab */}
          <TabPanel>
            <Box 
              p={5}
              borderWidth="1px"
              borderRadius="lg"
              borderColor={borderColor}
            >
              <CompetitorAnalysis userId={userId} />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default RankingPage; 