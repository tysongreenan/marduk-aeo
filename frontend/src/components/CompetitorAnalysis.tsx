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
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Flex,
  SimpleGrid,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react';
import { addCompetitor, getCompetitors, getCompetitorAnalysis } from '../api';

interface CompetitorAnalysisProps {
  userId: string;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Array<{ 
    id: string, 
    competitor_name: string, 
    created_at: string 
  }>>([]);
  const [analysisData, setAnalysisData] = useState<Array<{ 
    competitor_name: string, 
    metrics: { 
      seo_optimization: number, 
      content_freshness: number, 
      site_authority: number, 
      ai_visibility: number 
    } 
  }>>([]);
  const [competitorName, setCompetitorName] = useState('');
  const [nameError, setNameError] = useState('');
  
  const toast = useToast();
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get competitors
        const competitorsData = await getCompetitors();
        setCompetitors(competitorsData);
        
        // Get analysis data
        const analysis = await getCompetitorAnalysis();
        setAnalysisData(analysis);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching competitor data:', err);
        setError('Failed to load competitor data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [userId]);
  
  const handleAddCompetitor = async () => {
    // Validate input
    if (!competitorName.trim()) {
      setNameError('Competitor name is required');
      return;
    }
    
    setNameError('');
    setIsSubmitting(true);
    
    try {
      // Call API to add competitor
      const result = await addCompetitor(competitorName);
      
      if (result.success) {
        toast({
          title: 'Competitor added',
          description: result.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Reset form
        setCompetitorName('');
        
        // Refresh data
        const competitorsData = await getCompetitors();
        setCompetitors(competitorsData);
        
        // Get updated analysis
        const analysis = await getCompetitorAnalysis();
        setAnalysisData(analysis);
      } else {
        toast({
          title: 'Failed to add competitor',
          description: result.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('Error adding competitor:', err);
      toast({
        title: 'Error',
        description: 'An error occurred while adding the competitor',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
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
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };
  
  // Check if this is the user's brand
  const isUserBrand = (name: string) => name.includes('(Your Brand)');
  
  return (
    <Box>
      <Heading size="md" mb={2}>Competitor Analysis</Heading>
      <Text fontSize="sm" mb={4} color="gray.600">
        Compare your brand's performance against competitors
      </Text>
      
      {/* Form to add a competitor */}
      <Box 
        mb={6} 
        p={4} 
        borderWidth="1px" 
        borderRadius="md" 
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <Heading size="sm" mb={3}>Add a Competitor</Heading>
        <Flex gap={4}>
          <FormControl isInvalid={!!nameError} flex="1">
            <FormLabel htmlFor="competitor-name" srOnly>Competitor Name</FormLabel>
            <Input
              id="competitor-name"
              placeholder="Enter competitor name"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
            />
            {nameError && <FormErrorMessage>{nameError}</FormErrorMessage>}
          </FormControl>
          <Button 
            colorScheme="blue" 
            isLoading={isSubmitting} 
            onClick={handleAddCompetitor}
          >
            Add
          </Button>
        </Flex>
      </Box>
      
      {/* Competitor metrics */}
      {analysisData.length > 0 ? (
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead bg={headerBg}>
              <Tr>
                <Th>Competitor</Th>
                <Th>SEO Optimization</Th>
                <Th>Content Freshness</Th>
                <Th>Site Authority</Th>
                <Th>AI Visibility</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analysisData.map((item, index) => (
                <Tr 
                  key={index}
                  bg={isUserBrand(item.competitor_name) ? useColorModeValue('blue.50', 'blue.900') : undefined}
                >
                  <Td fontWeight={isUserBrand(item.competitor_name) ? 'bold' : 'medium'}>
                    {item.competitor_name}
                  </Td>
                  <Td>
                    <Progress 
                      value={item.metrics.seo_optimization} 
                      max={100} 
                      size="sm" 
                      colorScheme={getScoreColor(item.metrics.seo_optimization)}
                      borderRadius="full"
                    />
                    <Text fontSize="xs" textAlign="right" mt={1}>
                      {item.metrics.seo_optimization}%
                    </Text>
                  </Td>
                  <Td>
                    <Progress 
                      value={item.metrics.content_freshness} 
                      max={100} 
                      size="sm" 
                      colorScheme={getScoreColor(item.metrics.content_freshness)}
                      borderRadius="full"
                    />
                    <Text fontSize="xs" textAlign="right" mt={1}>
                      {item.metrics.content_freshness}%
                    </Text>
                  </Td>
                  <Td>
                    <Progress 
                      value={item.metrics.site_authority} 
                      max={100} 
                      size="sm" 
                      colorScheme={getScoreColor(item.metrics.site_authority)}
                      borderRadius="full"
                    />
                    <Text fontSize="xs" textAlign="right" mt={1}>
                      {item.metrics.site_authority}%
                    </Text>
                  </Td>
                  <Td>
                    <Progress 
                      value={item.metrics.ai_visibility} 
                      max={100} 
                      size="sm" 
                      colorScheme={getScoreColor(item.metrics.ai_visibility)}
                      borderRadius="full"
                    />
                    <Text fontSize="xs" textAlign="right" mt={1}>
                      {item.metrics.ai_visibility}%
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          No competitor data available. Please add competitors using the form above.
        </Alert>
      )}
      
      <Text fontSize="xs" mt={4} color="gray.500">
        Analysis based on AI evaluation of brand content and visibility in search results
      </Text>
    </Box>
  );
};

export default CompetitorAnalysis; 