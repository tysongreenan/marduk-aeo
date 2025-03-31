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
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import Dashboard from './components/Dashboard';
import RankingPage from './components/RankingPage';
import Welcome from './components/Welcome';
import AccountPage from './components/AccountPage';
import Pricing from './components/Pricing';
import PlanUsage from './components/PlanUsage';

function App() {
  const [activeView, setActiveView] = useState<'rankings' | 'planUsage' | 'account' | 'pricing'>('rankings');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate a brief loading state for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
  
  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('onboarded', 'true');
  };
  
  const handleLogout = () => {
    // Just reload the page in this simplified version
    window.location.reload();
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  // Skip authentication entirely
  // Check for onboarding status in localStorage for persistent state
  const onboardedStatus = localStorage.getItem('onboarded');
  if (!hasCompletedOnboarding && onboardedStatus !== 'true') {
    return <Welcome onComplete={handleOnboardingComplete} />;
  }

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

      {activeView === 'rankings' && <RankingPage userId="mock-user-123" />}
      {activeView === 'planUsage' && <PlanUsage />}
      {activeView === 'account' && <AccountPage />}
      {activeView === 'pricing' && <Pricing />}
    </Box>
  );
}

export default App;
