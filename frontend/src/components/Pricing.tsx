import { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  SimpleGrid,
  VStack,
  HStack,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
  Badge,
  Divider,
  useToast
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';

const Pricing = () => {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('blue.500', 'blue.300');

  // Static pricing data 
  const staticProducts = [
    {
      id: 'prod_starter',
      name: 'Starter',
      description: 'Perfect for small businesses and startups',
      prices: [
        {
          id: 'price_starter_monthly',
          currency: 'USD',
          unit_amount: 4900,
          interval: 'month',
          interval_count: 1
        }
      ],
      metadata: {
        features: JSON.stringify([
          '250 queries per month',
          '3 brands to monitor',
          'Basic keyword insights',
          'Weekly email reports'
        ]),
        isPopular: 'false'
      }
    },
    {
      id: 'prod_professional',
      name: 'Professional',
      description: 'Ideal for growing businesses and agencies',
      prices: [
        {
          id: 'price_professional_monthly',
          currency: 'USD',
          unit_amount: 9900,
          interval: 'month',
          interval_count: 1
        }
      ],
      metadata: {
        features: JSON.stringify([
          '1000 queries per month',
          '10 brands to monitor',
          'Advanced keyword insights',
          'Daily email reports',
          'Competitor analysis',
          'Priority support'
        ]),
        isPopular: 'true'
      }
    },
    {
      id: 'prod_enterprise',
      name: 'Enterprise',
      description: 'For large organizations with advanced needs',
      prices: [
        {
          id: 'price_enterprise_monthly',
          currency: 'USD',
          unit_amount: 19900,
          interval: 'month',
          interval_count: 1
        }
      ],
      metadata: {
        features: JSON.stringify([
          'Unlimited queries',
          'Unlimited brands',
          'Custom keyword planning',
          'API access',
          'Dedicated account manager',
          'Custom reporting',
          'SLA guarantees'
        ]),
        isPopular: 'false'
      }
    }
  ];
  
  const handleSubscription = async (priceId: string) => {
    try {
      setCheckoutLoading(true);
      // Simulate checkout process
      setTimeout(() => {
        toast({
          title: 'Subscription feature disabled',
          description: 'This is a demo version with Stripe integration disabled.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
        setCheckoutLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error in demo checkout:', error);
      toast({
        title: 'Checkout error',
        description: 'This is a demo version with Stripe integration disabled.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setCheckoutLoading(false);
    }
  };
  
  // Helper to format price
  const formatPrice = (price: any) => {
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: 0
    }).format(price.unit_amount / 100);
    
    const interval = price.interval
      ? price.interval_count === 1
        ? `/${price.interval}`
        : `/${price.interval_count} ${price.interval}s`
      : '';
      
    return `${amount}${interval}`;
  };

  return (
    <Box py={12} px={4}>
      <Box textAlign="center" mb={12}>
        <Heading as="h1" size="2xl" mb={4}>
          Pricing Plans
        </Heading>
        <Text fontSize="lg" maxW="2xl" mx="auto">
          Choose the plan that best fits your needs. All plans include core features.
        </Text>
      </Box>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: staticProducts.length > 2 ? 3 : 2 }} spacing={10} maxW="6xl" mx="auto">
        {staticProducts.map((product) => {
          const price = product.prices?.[0];
          
          if (!price) return null;
          
          const features = product.metadata?.features 
            ? JSON.parse(product.metadata.features) 
            : ['Basic feature'];
            
          const isPopular = product.metadata?.isPopular === 'true';
          
          return (
            <Box
              key={product.id}
              bg={cardBg}
              boxShadow="lg"
              borderRadius="lg"
              overflow="hidden"
              position="relative"
              transform={isPopular ? { lg: 'scale(1.05)' } : undefined}
              zIndex={isPopular ? 1 : 0}
              border={isPopular ? `2px solid ${accentColor}` : undefined}
            >
              {isPopular && (
                <Badge
                  position="absolute"
                  top={4}
                  right={4}
                  colorScheme="blue"
                  fontSize="sm"
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  Popular
                </Badge>
              )}
              
              <Box bg={headerBg} p={6}>
                <Heading as="h3" size="lg" mb={2}>
                  {product.name}
                </Heading>
                <Text fontSize="sm" color="gray.500" minH="3rem">
                  {product.description}
                </Text>
                <Heading as="h4" size="2xl" mt={4}>
                  {formatPrice(price)}
                </Heading>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  {price.interval && `Billed ${price.interval_count && price.interval_count > 1 
                    ? `every ${price.interval_count} ${price.interval}s` 
                    : price.interval}ly`}
                </Text>
              </Box>
              
              <Divider />
              
              <VStack spacing={4} p={6} align="stretch">
                <List spacing={3}>
                  {features.map((feature: string, index: number) => (
                    <ListItem key={index}>
                      <HStack>
                        <ListIcon as={CheckIcon} color="green.500" />
                        <Text>{feature}</Text>
                      </HStack>
                    </ListItem>
                  ))}
                </List>
                
                <Box mt={4}>
                  <Button
                    w="full"
                    colorScheme={isPopular ? 'blue' : 'gray'}
                    variant={isPopular ? 'solid' : 'outline'}
                    size="lg"
                    onClick={() => handleSubscription(price.id)}
                    isLoading={checkoutLoading}
                  >
                    Subscribe
                  </Button>
                </Box>
              </VStack>
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default Pricing; 