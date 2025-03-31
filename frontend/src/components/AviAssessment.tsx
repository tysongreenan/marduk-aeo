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
  StatArrow,
  Badge,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { getAviAssessment } from '../api';

interface AviAssessmentProps {
  userId: string;
}

const AviAssessment: React.FC<AviAssessmentProps> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviData, setAviData] = useState<{ 
    low: number, 
    low_change: number, 
    medium: number, 
    medium_change: number, 
    high: number, 
    high_change: number, 
    overall: string 
  }>({
    low: 0,
    low_change: 0,
    medium: 0,
    medium_change: 0,
    high: 0,
    high_change: 0,
    overall: 'Medium'
  });
  
  useEffect(() => {
    const fetchAviData = async () => {
      try {
        setIsLoading(true);
        const data = await getAviAssessment();
        setAviData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching AVI assessment:', err);
        setError('Failed to load AVI assessment. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAviData();
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
  
  const getOverallBadge = () => {
    switch (aviData.overall) {
      case 'High':
        return <Badge colorScheme="green" px={2} py={1} fontSize="md">High</Badge>;
      case 'Medium':
        return <Badge colorScheme="yellow" px={2} py={1} fontSize="md">Medium</Badge>;
      case 'Low':
        return <Badge colorScheme="red" px={2} py={1} fontSize="md">Low</Badge>;
      default:
        return <Badge colorScheme="gray" px={2} py={1} fontSize="md">Unknown</Badge>;
    }
  };
  
  const getArrowType = (change: number) => change >= 0 ? 'increase' : 'decrease';
  const getChangeColor = (change: number) => change >= 0 ? 'green.500' : 'red.500';
  
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading size="md" mb={1}>AI Visibility Impact (AVI)</Heading>
          <Text fontSize="sm" color="gray.600">
            Assessment of your brand's visibility in AI-powered search
          </Text>
        </Box>
        {getOverallBadge()}
      </Flex>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="md" 
          bg={useColorModeValue('red.50', 'rgba(254, 178, 178, 0.16)')}
          borderColor={useColorModeValue('red.200', 'red.800')}
        >
          <Stat>
            <StatLabel color={useColorModeValue('red.600', 'red.300')}>Low AVI</StatLabel>
            <StatNumber>{aviData.low}</StatNumber>
            <StatHelpText>
              <StatArrow type={getArrowType(aviData.low_change)} color={getChangeColor(aviData.low_change)} />
              {Math.abs(aviData.low_change)}
            </StatHelpText>
          </Stat>
        </Box>
        
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="md" 
          bg={useColorModeValue('yellow.50', 'rgba(250, 240, 137, 0.16)')}
          borderColor={useColorModeValue('yellow.200', 'yellow.800')}
        >
          <Stat>
            <StatLabel color={useColorModeValue('yellow.600', 'yellow.300')}>Medium AVI</StatLabel>
            <StatNumber>{aviData.medium}</StatNumber>
            <StatHelpText>
              <StatArrow type={getArrowType(aviData.medium_change)} color={getChangeColor(aviData.medium_change)} />
              {Math.abs(aviData.medium_change)}
            </StatHelpText>
          </Stat>
        </Box>
        
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="md" 
          bg={useColorModeValue('green.50', 'rgba(154, 230, 180, 0.16)')}
          borderColor={useColorModeValue('green.200', 'green.800')}
        >
          <Stat>
            <StatLabel color={useColorModeValue('green.600', 'green.300')}>High AVI</StatLabel>
            <StatNumber>{aviData.high}</StatNumber>
            <StatHelpText>
              <StatArrow type={getArrowType(aviData.high_change)} color={getChangeColor(aviData.high_change)} />
              {Math.abs(aviData.high_change)}
            </StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>
      
      <Alert 
        status={aviData.overall === 'High' ? 'success' : aviData.overall === 'Medium' ? 'warning' : 'error'}
        variant="subtle"
        borderRadius="md"
      >
        <AlertIcon />
        Your brand's overall AI Visibility Impact is <strong>{aviData.overall}</strong>.
        {aviData.overall === 'High' 
          ? ' Your brand is performing well in AI search results.' 
          : aviData.overall === 'Medium'
            ? ' Your brand has moderate visibility in AI search results.'
            : ' Your brand has low visibility in AI search results and needs improvement.'}
      </Alert>
      
      <Text fontSize="xs" mt={4} color="gray.500">
        Based on appearance rates across all keywords and LLMs in the last 7 days
      </Text>
    </Box>
  );
};

export default AviAssessment; 