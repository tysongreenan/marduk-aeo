import { useState, useEffect } from 'react';
import { 
  Box,
  Flex,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Center,
  useToast,
  Text,
  Heading,
  Container,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import Dashboard from './components/Dashboard';
import RankingPage from './components/RankingPage';
import Welcome from './components/Welcome';
import AccountPage from './components/AccountPage';
import Pricing from './components/Pricing';
import PlanUsage from './components/PlanUsage';
import { supabase } from './utils/supabase';

// Landing page component
const LandingPage = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <Box>
      {/* Header with login button */}
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        padding="1rem"
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Box fontWeight="bold" fontSize="xl" color="blue.500">Marduk AEO</Box>
        <Button 
          colorScheme="blue" 
          size="md" 
          onClick={onLogin}
        >
          Log in
        </Button>
      </Flex>

      {/* Hero section */}
      <Box bg="blue.600" color="white" py={20} px={4}>
        <Container maxW="container.xl">
          <Heading as="h1" size="3xl" mb={6} textAlign="center">
            Track Your Brand Visibility<br/>in AI Search Results
          </Heading>
          <Text fontSize="xl" textAlign="center" maxW="800px" mx="auto" mb={10}>
            Monitor and analyze how your brand appears in AI-powered search results. 
            Get insights, track mentions, and stay ahead of the competition.
          </Text>
          <Flex justify="center">
            <Button 
              colorScheme="white" 
              bg="white" 
              color="blue.600" 
              size="lg" 
              onClick={onLogin}
              _hover={{ bg: "gray.100" }}
            >
              Get Started
            </Button>
          </Flex>
        </Container>
      </Box>

      {/* Features section */}
      <Box py={16} px={4}>
        <Container maxW="container.xl">
          <Heading as="h2" size="xl" mb={12} textAlign="center">
            Why Choose AI-Rank Booster?
          </Heading>
          <Flex 
            direction={{ base: "column", md: "row" }} 
            justify="space-between" 
            align="flex-start"
            gap={8}
          >
            <Box flex="1" p={6} borderRadius="md" borderWidth="1px">
              <Heading as="h3" size="md" mb={4}>Real-time Monitoring</Heading>
              <Text>Track how your brand appears in AI search results with comprehensive monitoring tools.</Text>
            </Box>
            <Box flex="1" p={6} borderRadius="md" borderWidth="1px">
              <Heading as="h3" size="md" mb={4}>Competitor Analysis</Heading>
              <Text>See how your visibility compares to competitors and identify opportunities.</Text>
            </Box>
            <Box flex="1" p={6} borderRadius="md" borderWidth="1px">
              <Heading as="h3" size="md" mb={4}>Actionable Insights</Heading>
              <Text>Get clear recommendations to improve your brand's visibility in AI responses.</Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Footer */}
      <Box bg="gray.100" py={10} px={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Text>© 2023 Marduk AEO. All rights reserved.</Text>
            <Button variant="link" onClick={onLogin}>Sign in</Button>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

function App() {
  const [activeView, setActiveView] = useState<'rankings' | 'planUsage' | 'account' | 'pricing'>('rankings');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showLanding, setShowLanding] = useState(true);
  const toast = useToast();
  
  // Check auth status on load
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Get session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          setUser(session.user);
          setShowLanding(false);
          
          // Check if user has completed onboarding
          const onboardedStatus = localStorage.getItem('onboarded');
          setHasCompletedOnboarding(onboardedStatus === 'true');
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
          setShowLanding(false);
        } else {
          setUser(null);
          setShowLanding(true);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('onboarded', 'true');
  };
  
  const handleLogout = async () => {
    try {
      // Properly sign out using Supabase auth
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      // Clear local storage
      localStorage.removeItem('onboarded');
      // Show landing page
      setShowLanding(true);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Logout failed",
        description: "Please try again",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleLogin = () => {
    setShowLanding(false);
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  // Show landing page if no user or explicitly set to show landing
  if (showLanding) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // Show onboarding if user hasn't completed it
  if (!hasCompletedOnboarding) {
    return <Welcome onComplete={handleOnboardingComplete} />;
  }

  // Show main app if user is logged in and has completed onboarding
  return (
    <Box>
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        padding="1rem"
        bg="blue.500"
        color="white"
      >
        <Box fontWeight="bold" fontSize="lg">AI-Rank Booster</Box>
        <Flex align="center">
          <Button
            variant={activeView === 'rankings' ? 'solid' : 'ghost'}
            mr={2}
            onClick={() => setActiveView('rankings')}
          >
            Rankings
          </Button>
          <Button
            variant={activeView === 'planUsage' ? 'solid' : 'ghost'}
            mr={2}
            onClick={() => setActiveView('planUsage')}
          >
            Plan Usage
          </Button>
          <Button
            variant={activeView === 'pricing' ? 'solid' : 'ghost'}
            mr={4}
            onClick={() => setActiveView('pricing')}
          >
            Pricing
          </Button>
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
              Account
            </MenuButton>
            <MenuList color="black">
              <MenuItem onClick={() => setActiveView('account')}>My Account</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      {activeView === 'rankings' && <RankingPage userId={user?.id || "mock-user-123"} />}
      {activeView === 'planUsage' && <PlanUsage />}
      {activeView === 'account' && <AccountPage />}
      {activeView === 'pricing' && <Pricing />}
    </Box>
  );
}

export default App;
