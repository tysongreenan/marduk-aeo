import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Divider,
  VStack,
  HStack,
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Spinner,
  Center,
  useToast,
  useColorModeValue
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { Subscription, Price, Product } from '../types';
import { getSubscription, getProductsWithPrices, createPortalSession } from '../utils/stripe';

interface AccountBillingProps {
  onUpgrade?: () => void;
}

const AccountBilling: React.FC<AccountBillingProps> = ({ onUpgrade }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  
  const { user } = useAuth();
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const subtleBg = useColorModeValue('gray.50', 'gray.700');
  
  useEffect(() => {
    const loadSubscriptionDetails = async () => {
      setIsLoading(true);
      try {
        // Load subscription details
        const sub = await getSubscription();
        setSubscription(sub);
        
        // Load available products for potential upgrades
        const products = await getProductsWithPrices();
        setProducts(products);
      } catch (error) {
        console.error('Error loading subscription details:', error);
        toast({
          title: 'Error loading subscription',
          description: 'Could not load your subscription information. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      loadSubscriptionDetails();
    }
  }, [user, toast]);
  
  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      await createPortalSession();
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
      toast({
        title: 'Portal error',
        description: 'There was an error accessing your subscription management portal. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  const formatPrice = (price?: Price) => {
    if (!price) return '';
    
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: 0
    }).format(price.unit_amount / 100);
    
    const interval = price.interval
      ? price.interval_count && price.interval_count > 1
        ? `every ${price.interval_count} ${price.interval}s`
        : `per ${price.interval}`
      : '';
      
    return `${amount} ${interval}`;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'trialing':
        return 'blue';
      case 'past_due':
        return 'yellow';
      case 'canceled':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  const getSubscriptionProduct = () => {
    if (!subscription?.price_id) return null;
    
    const product = products.find(p => 
      p.prices?.some(price => price.id === subscription.price_id)
    );
    
    const price = product?.prices?.find(p => p.id === subscription.price_id);
    
    return { product, price };
  };
  
  if (isLoading) {
    return (
      <Center py={10}>
        <Spinner size="xl" />
      </Center>
    );
  }
  
  const subscriptionDetails = getSubscriptionProduct();
  
  return (
    <Box py={8}>
      <Heading as="h2" size="xl" mb={6}>
        Subscription Management
      </Heading>
      
      {subscription ? (
        <Card bg={cardBg} boxShadow="md" mb={6}>
          <CardHeader bg={subtleBg} pb={3}>
            <HStack justify="space-between" align="center">
              <Heading size="md">
                {subscriptionDetails?.product?.name || 'Your Subscription'}
              </Heading>
              <Badge 
                colorScheme={getStatusColor(subscription.status)}
                fontSize="sm"
                px={2.5}
                py={1}
                borderRadius="full"
              >
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </Badge>
            </HStack>
          </CardHeader>
          
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="medium" color="gray.500">Subscription Plan</Text>
                <Text fontWeight="bold">{subscriptionDetails?.product?.name || 'Custom Plan'}</Text>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontWeight="medium" color="gray.500">Price</Text>
                <Text fontWeight="bold">{formatPrice(subscriptionDetails?.price)}</Text>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontWeight="medium" color="gray.500">Current Period</Text>
                <Text>
                  {formatDate(subscription.current_period_start)} to{' '}
                  {formatDate(subscription.current_period_end)}
                </Text>
              </HStack>
              
              {subscription.trial_end && (
                <HStack justify="space-between">
                  <Text fontWeight="medium" color="gray.500">Trial Ends</Text>
                  <Text>{formatDate(subscription.trial_end)}</Text>
                </HStack>
              )}
              
              {subscription.cancel_at_period_end && (
                <Box 
                  p={3} 
                  bg="orange.50" 
                  color="orange.800" 
                  borderRadius="md" 
                  borderLeft="4px solid" 
                  borderLeftColor="orange.500"
                >
                  <Text fontWeight="medium">
                    Your subscription will end on {formatDate(subscription.current_period_end)}
                  </Text>
                </Box>
              )}
            </VStack>
          </CardBody>
          
          <Divider />
          
          <CardFooter>
            <Button
              onClick={handleManageSubscription}
              colorScheme="blue"
              isLoading={isLoadingPortal}
              width="full"
            >
              Manage Subscription
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card bg={cardBg} boxShadow="md" mb={6}>
          <CardBody>
            <VStack spacing={4} align="center" py={6}>
              <Text fontSize="lg">
                You don't have an active subscription.
              </Text>
              <Button
                colorScheme="blue"
                onClick={onUpgrade}
              >
                View Pricing Plans
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}
      
      {products.length > 0 && subscription && (
        <Box mt={10}>
          <Heading as="h3" size="md" mb={4}>
            Available Plans
          </Heading>
          <Text color="gray.500" mb={6}>
            You can upgrade your subscription at any time.
          </Text>
          
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={onUpgrade}
          >
            View All Plans
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AccountBilling; 