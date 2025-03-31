import React from 'react';
import {
  Box,
  Heading,
  Text,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  useColorModeValue,
} from '@chakra-ui/react';

const PlanUsage: React.FC = () => {
  // Mock data for plan usage
  const usageData = {
    totalSearches: 450,
    maxSearches: 1000,
    daysLeft: 14,
    planName: 'Pro',
    renewalDate: '2025-06-01',
  };

  // Calculate usage percentage
  const usagePercentage = Math.round((usageData.totalSearches / usageData.maxSearches) * 100);
  
  // Determine color based on usage
  const getUsageColor = () => {
    if (usagePercentage < 50) return 'green';
    if (usagePercentage < 80) return 'blue';
    if (usagePercentage < 90) return 'yellow';
    return 'red';
  };

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box p={8}>
      <Heading mb={6}>Plan Usage</Heading>
      
      <Box mb={8} p={6} borderWidth="1px" borderRadius="lg" borderColor={borderColor} bg={cardBg}>
        <Heading size="md" mb={4}>Usage Summary</Heading>
        
        <Text mb={2}>
          {usageData.totalSearches} of {usageData.maxSearches} searches used this month
        </Text>
        
        <Progress 
          value={usagePercentage} 
          colorScheme={getUsageColor()} 
          height="24px" 
          borderRadius="md"
          mb={2}
        />
        
        <Text fontSize="sm" color="gray.500" textAlign="right">
          {usagePercentage}% of monthly limit
        </Text>
        
        {usagePercentage >= 80 && (
          <Alert status="warning" mt={4} borderRadius="md">
            <AlertIcon />
            You're approaching your monthly limit. Consider upgrading your plan for additional searches.
          </Alert>
        )}
      </Box>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <Card borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>Current Plan</StatLabel>
              <StatNumber>{usageData.planName}</StatNumber>
              <StatHelpText>1,000 searches/month</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>Days Left</StatLabel>
              <StatNumber>{usageData.daysLeft}</StatNumber>
              <StatHelpText>In current billing cycle</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>Next Renewal</StatLabel>
              <StatNumber>
                {new Date(usageData.renewalDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </StatNumber>
              <StatHelpText>Automatic renewal</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default PlanUsage; 