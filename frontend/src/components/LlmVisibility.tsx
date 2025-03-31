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
  Alert,
  AlertIcon,
  Progress,
  Image,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { getLlmVisibility } from '../api';

interface LlmVisibilityProps {
  userId: string;
}

const LlmVisibility: React.FC<LlmVisibilityProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [llmData, setLlmData] = useState<Array<{ 
    llm: string, 
    rate: number, 
    count: number, 
    total: number 
  }>>([]);
  
  // LLM logos and colors
  const llmInfo: Record<string, { name: string, color: string }> = {
    'gpt-3.5-turbo': { name: 'ChatGPT', color: 'green.500' },
    'gemini': { name: 'Gemini', color: 'blue.500' },
    'perplexity': { name: 'Perplexity', color: 'purple.500' },
    'claude': { name: 'Claude', color: 'orange.500' },
    'chatgpt': { name: 'ChatGPT', color: 'green.500' },
  };
  
  useEffect(() => {
    const fetchLlmData = async () => {
      try {
        setIsLoading(true);
        const data = await getLlmVisibility();
        setLlmData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching LLM visibility data:', err);
        setError('Failed to load LLM visibility data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLlmData();
  }, [userId]);
  
  // Get LLM with highest visibility
  const getTopLlm = () => {
    if (llmData.length === 0) return null;
    return llmData[0];
  };
  
  const topLlm = getTopLlm();
  
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
  
  if (llmData.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        No LLM visibility data available. Please run queries first.
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
      <Heading size="md" mb={2}>LLM-Specific Visibility</Heading>
      
      {topLlm && (
        <Text fontSize="sm" mb={4} color="gray.600">
          Your brand has the highest visibility on {llmInfo[topLlm.llm]?.name || topLlm.llm} 
          ({topLlm.rate}% appearance rate).
        </Text>
      )}
      
      <Table variant="simple" size="sm">
        <Thead bg={useColorModeValue("gray.50", "gray.800")}>
          <Tr>
            <Th>LLM</Th>
            <Th isNumeric>Rate</Th>
            <Th isNumeric>Appearances</Th>
            <Th>Visibility</Th>
          </Tr>
        </Thead>
        <Tbody>
          {llmData.map((item, index) => (
            <Tr key={index}>
              <Td fontWeight="medium">
                <Flex align="center">
                  <Box w="3px" h="18px" borderRadius="full" mr={2} bg={llmInfo[item.llm]?.color || 'gray.500'} />
                  {llmInfo[item.llm]?.name || item.llm}
                </Flex>
              </Td>
              <Td isNumeric>
                <Badge colorScheme={getBadgeColor(item.rate)}>
                  {item.rate}%
                </Badge>
              </Td>
              <Td isNumeric>
                {item.count}/{item.total}
              </Td>
              <Td>
                <Progress 
                  value={item.rate} 
                  max={100}
                  size="sm" 
                  colorScheme={getBadgeColor(item.rate)}
                  borderRadius="full"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      
      <Text fontSize="xs" mt={4} color="gray.500">
        Based on {llmData.reduce((sum, item) => sum + item.total, 0)} total queries across all LLMs
      </Text>
    </Box>
  );
};

export default LlmVisibility; 