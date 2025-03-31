import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Stack,
  Badge,
  Spinner,
  Center,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { checkRankingAlerts } from '../api';
import { RankingAlert } from '../types';

interface RankingAlertsProps {
  userId: string;
  days: number;
}

const RankingAlerts: React.FC<RankingAlertsProps> = ({ userId, days }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        const response = await checkRankingAlerts(userId, days);
        
        // Convert RankingAlert objects to UI-friendly format
        const formattedAlerts = response.alerts.map((alert: RankingAlert) => {
          // Determine alert type based on percentage vs threshold
          const type = 
            alert.percentage > alert.threshold ? 'positive' :
            alert.percentage < alert.threshold - 10 ? 'negative' : 'neutral';
            
          return {
            id: `alert-${Math.random().toString(36).substring(2, 9)}`,
            type,
            message: alert.message,
            date: new Date().toISOString() // Use current date as mock
          };
        });
        
        setAlerts(formattedAlerts);
        setError(null);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError('Failed to load alerts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAlerts();
  }, [userId, days]);

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (isLoading) {
    return (
      <Center py={4}>
        <Spinner size="md" />
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
  
  if (alerts.length === 0) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        No alerts found. Your rankings appear to be stable.
      </Alert>
    );
  }

  return (
    <Box>
      <Heading size="md" mb={4}>Recent Alerts</Heading>
      
      <Stack spacing={3}>
        {alerts.map(alert => (
          <Box 
            key={alert.id}
            p={3}
            borderRadius="md"
            bg={
              alert.type === 'positive' ? 'green.50' : 
              alert.type === 'negative' ? 'red.50' : 
              'yellow.50'
            }
            borderLeft="4px solid"
            borderLeftColor={
              alert.type === 'positive' ? 'green.400' : 
              alert.type === 'negative' ? 'red.400' : 
              'yellow.400'
            }
          >
            <Text fontWeight="medium">{alert.message}</Text>
            <Text fontSize="sm" color="gray.600" mt={1}>
              {formatDate(alert.date)}
            </Text>
          </Box>
        ))}
      </Stack>
      
      <Text fontSize="sm" color="gray.500" mt={4} textAlign="center">
        Showing alerts for the last {days} days
      </Text>
    </Box>
  );
};

export default RankingAlerts; 