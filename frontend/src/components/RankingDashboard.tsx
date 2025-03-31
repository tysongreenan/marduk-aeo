import React, { useState } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  Flex,
  useColorModeValue,
  Container
} from '@chakra-ui/react';
import RankingPerformance from './RankingPerformance';
import RankingTrends from './RankingTrends';
import KeywordInsights from './KeywordInsights';
import RankingAlerts from './RankingAlerts';

interface RankingDashboardProps {
  userId: string;
}

const RankingDashboard: React.FC<RankingDashboardProps> = ({ userId }) => {
  const [timeRange, setTimeRange] = useState<string>('7');
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const headerBg = useColorModeValue('white', 'gray.800');
  
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value);
  };
  
  return (
    <Box bgColor={bgColor} minHeight="100vh" py={6}>
      <Container maxW="container.xl">
        <Box bg={headerBg} p={4} borderRadius="md" boxShadow="sm" mb={6}>
          <Flex justifyContent="space-between" alignItems="center">
            <Heading size="lg">Brand Ranking Dashboard</Heading>
            
            <Flex alignItems="center">
              <Box as="span" mr={2} fontWeight="medium">Time Range:</Box>
              <Select 
                value={timeRange} 
                onChange={handleTimeRangeChange}
                width="150px"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </Select>
            </Flex>
          </Flex>
        </Box>
        
        <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={6} mb={6}>
          <GridItem colSpan={{ base: 1, lg: 2 }}>
            <Box bg={headerBg} p={4} borderRadius="md" boxShadow="sm">
              <RankingPerformance userId={userId} days={parseInt(timeRange)} />
            </Box>
          </GridItem>
          <GridItem colSpan={{ base: 1, lg: 1 }}>
            <Box bg={headerBg} p={4} borderRadius="md" boxShadow="sm">
              <RankingAlerts userId={userId} days={parseInt(timeRange)} />
            </Box>
          </GridItem>
        </Grid>
        
        <Tabs variant="enclosed" colorScheme="blue" bg={headerBg} borderRadius="md" boxShadow="sm">
          <TabList>
            <Tab>Ranking Trends</Tab>
            <Tab>Insights & Recommendations</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              <RankingTrends userId={userId} days={parseInt(timeRange)} />
            </TabPanel>
            
            <TabPanel>
              <KeywordInsights userId={userId} limit={10} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
};

export default RankingDashboard; 