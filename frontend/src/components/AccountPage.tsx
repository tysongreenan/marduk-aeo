import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  useColorModeValue,
  Button,
  Text,
  Spinner,
  Center,
  useToast,
} from '@chakra-ui/react';
import Pricing from './Pricing';
import { supabase } from '../utils/supabase';

interface UserData {
  email: string;
  organization: string;
  role: string;
}

const AccountPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const headerBg = useColorModeValue('white', 'gray.800');
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get user from Supabase
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        if (user) {
          // Format user data
          setUserData({
            email: user.email || 'No email available',
            organization: user.user_metadata?.organization_id || 'Your Company',
            role: user.user_metadata?.role || 'User'
          });
        } else {
          // Fallback to demo data if no user found
          setUserData({
            email: 'demo@example.com',
            organization: 'Acme Corporation', 
            role: 'Administrator'
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Error loading profile',
          description: 'Could not load your profile information',
          status: 'error',
          duration: 3000,
        });
        
        // Use demo data as fallback
        setUserData({
          email: 'demo@example.com',
          organization: 'Acme Corporation',
          role: 'Administrator'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [toast]);
  
  const handleUpgrade = () => {
    setShowPricing(true);
  };
  
  const handleBackToAccount = () => {
    setShowPricing(false);
  };
  
  if (showPricing) {
    return (
      <Box bgColor={bgColor} minHeight="100vh" py={6}>
        <Container maxW="container.xl">
          <Flex justifyContent="space-between" mb={6}>
            <Heading size="lg">Subscription Plans</Heading>
            <Box as="button" color="blue.500" fontWeight="medium" onClick={handleBackToAccount}>
              &larr; Back to Account
            </Box>
          </Flex>
          <Pricing />
        </Container>
      </Box>
    );
  }
  
  if (isLoading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" />
      </Center>
    );
  }
  
  return (
    <Box bgColor={bgColor} minHeight="100vh" py={6}>
      <Container maxW="container.xl">
        <Box bg={headerBg} p={6} borderRadius="md" boxShadow="sm" mb={6}>
          <Heading size="lg">My Account</Heading>
        </Box>
        
        <Tabs variant="enclosed" colorScheme="blue" bg={headerBg} borderRadius="md" boxShadow="sm">
          <TabList>
            <Tab onClick={() => setTabIndex(0)}>Profile</Tab>
            <Tab onClick={() => setTabIndex(1)}>Subscription</Tab>
            <Tab onClick={() => setTabIndex(2)}>API Keys</Tab>
            <Tab onClick={() => setTabIndex(3)}>Settings</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              <Box p={4}>
                <Heading as="h3" size="md" mb={4}>Profile Information</Heading>
                <Flex direction="column" gap={4}>
                  <Flex>
                    <Box width="150px" fontWeight="bold">Email:</Box>
                    <Box>{userData?.email}</Box>
                  </Flex>
                  <Flex>
                    <Box width="150px" fontWeight="bold">Organization:</Box>
                    <Box>{userData?.organization}</Box>
                  </Flex>
                  <Flex>
                    <Box width="150px" fontWeight="bold">Role:</Box>
                    <Box>{userData?.role}</Box>
                  </Flex>
                </Flex>
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box p={4}>
                <Heading as="h3" size="md" mb={4}>Subscription</Heading>
                <Box mb={4} p={4} borderWidth="1px" borderRadius="md">
                  <Heading as="h4" size="sm" mb={2}>Current Plan:</Heading>
                  <Text fontWeight="bold" fontSize="xl" mb={4}>Professional Plan (Demo)</Text>
                  <Text mb={1}>Next renewal: July 1, 2023</Text>
                  <Text mb={4}>Monthly cost: $99.00</Text>
                  <Button colorScheme="blue" onClick={handleUpgrade}>
                    Upgrade Plan
                  </Button>
                </Box>
                <Box mb={4} p={4} borderWidth="1px" borderRadius="md">
                  <Heading as="h4" size="sm" mb={2}>Usage This Month:</Heading>
                  <Flex justify="space-between" mb={2}>
                    <Text>Monthly queries:</Text>
                    <Text>684 / 1,000</Text>
                  </Flex>
                  <Flex justify="space-between" mb={2}>
                    <Text>Brands monitored:</Text>
                    <Text>3 / 10</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text>API requests:</Text>
                    <Text>2,154 / 10,000</Text>
                  </Flex>
                </Box>
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box p={4}>
                <Heading as="h3" size="md" mb={4}>API Keys</Heading>
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Text mb={2}>Your API key:</Text>
                  <Flex mb={4}>
                    <Box 
                      flex="1" 
                      bg="gray.100" 
                      p={2} 
                      borderRadius="md" 
                      fontFamily="mono"
                      fontSize="sm"
                    >
                      sk_demo_••••••••••••••••••••••••••••••
                    </Box>
                    <Button ml={2} size="sm">Copy</Button>
                    <Button ml={2} size="sm" colorScheme="red">Reset</Button>
                  </Flex>
                  <Text fontSize="sm" color="gray.600">
                    This key is for demo purposes only. In a real application, you would be able to create and manage API keys.
                  </Text>
                </Box>
              </Box>
            </TabPanel>
            
            <TabPanel>
              <Box p={4}>
                <Heading as="h3" size="md" mb={4}>Account Settings</Heading>
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Text mb={4}>Demo Mode: Settings cannot be changed in demo mode.</Text>
                  <Button isDisabled>Save Settings</Button>
                </Box>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
};

export default AccountPage; 