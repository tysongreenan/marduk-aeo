import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  CircularProgress,
  CircularProgressLabel,
  Stack,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { getEntityRecognition } from '../api';

interface EntityRecognitionProps {
  userId: string;
}

const EntityRecognition: React.FC<EntityRecognitionProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityData, setEntityData] = useState<{ 
    recognized: boolean, 
    recognition_rate: number 
  }>({
    recognized: false,
    recognition_rate: 0
  });
  
  useEffect(() => {
    const fetchEntityData = async () => {
      try {
        setIsLoading(true);
        const data = await getEntityRecognition();
        setEntityData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching entity recognition data:', err);
        setError('Failed to load entity recognition data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEntityData();
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
  
  const getStatusColor = () => {
    const rate = entityData.recognition_rate;
    if (rate >= 70) return 'green';
    if (rate >= 50) return 'blue';
    if (rate >= 30) return 'yellow';
    return 'red';
  };
  
  return (
    <Box>
      <Heading size="md" mb={2}>Entity Recognition</Heading>
      <Text fontSize="sm" mb={6} color="gray.600">
        Whether AIs recognize your brand as a distinct entity in search results
      </Text>
      
      <Stack spacing={6} align="center">
        <CircularProgress 
          value={entityData.recognition_rate} 
          color={getStatusColor() + '.400'} 
          size="160px"
          thickness="8px"
        >
          <CircularProgressLabel>
            {entityData.recognition_rate}%
          </CircularProgressLabel>
        </CircularProgress>
        
        <Badge 
          colorScheme={entityData.recognized ? 'green' : 'red'} 
          fontSize="lg" 
          py={2} 
          px={4} 
          borderRadius="full"
        >
          {entityData.recognized ? 'Recognized' : 'Not Recognized'}
        </Badge>
        
        <Alert 
          status={entityData.recognized ? 'success' : 'warning'}
          variant="subtle"
          borderRadius="md"
          width="100%"
        >
          <AlertIcon />
          {entityData.recognized 
            ? `Your brand is recognized as a distinct entity in ${entityData.recognition_rate}% of search results.` 
            : `Your brand is not consistently recognized as a distinct entity (only ${entityData.recognition_rate}% of search results).`}
        </Alert>
        
        <Box textAlign="center">
          <Text fontSize="sm" color="gray.600">
            {entityData.recognized 
              ? "Having good entity recognition means your brand is established in AI knowledge bases."
              : "Improving entity recognition requires building more online presence and authority."}
          </Text>
          
          {!entityData.recognized && (
            <Text fontSize="sm" mt={2} color="gray.600">
              Recommendation: Create a Wikipedia page, update your Google Business profile, and increase brand mentions across authoritative websites.
            </Text>
          )}
        </Box>
      </Stack>
      
      <Text fontSize="xs" mt={4} color="gray.500" textAlign="center">
        Based on analysis of entity recognition across all LLMs
      </Text>
    </Box>
  );
};

export default EntityRecognition; 