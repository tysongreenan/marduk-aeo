import { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  useColorModeValue, 
  Text, 
  Alert, 
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Divider
} from '@chakra-ui/react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../utils/supabase';
import { AuthProps } from '../types';

/**
 * Secure authentication component using Supabase Auth UI
 * This component handles sign in, sign up, password reset, and OAuth flows
 */
const SupabaseAuth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo123');
  const bgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.200');

  // Check for authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          onAuthSuccess();
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setIsDemoMode(true);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase auth event: ${event}`);
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        onAuthSuccess();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [onAuthSuccess]);

  // Handle various auth errors
  useEffect(() => {
    // Check for error in URL parameters (e.g., after OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (errorParam) {
      setAuthError(errorDescription || 'Authentication failed. Please try again.');
      
      // Clear the error from the URL to prevent showing it again on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('error_description');
      window.history.replaceState({}, document.title, newUrl.toString());
    }
  }, []);

  const handleDemoLogin = () => {
    // Demo mode login - just call onAuthSuccess for demo purposes
    onAuthSuccess();
  };

  if (isDemoMode) {
    return (
      <Container maxW="md" py={12}>
        <Box p={8} boxShadow="lg" borderRadius="md" bg={bgColor}>
          <Heading mb={6} textAlign="center" color={textColor}>
            Demo Login
          </Heading>
          
          <Alert status="info" mb={4} borderRadius="md">
            <AlertIcon />
            Using demo mode (no Supabase configuration)
          </Alert>
          
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter email"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password"
              />
            </FormControl>
            
            <Button 
              colorScheme="blue" 
              width="100%" 
              onClick={handleDemoLogin}
            >
              Sign In (Demo)
            </Button>
          </VStack>
          
          <Text mt={4} fontSize="sm" color="gray.500" textAlign="center">
            This is a demo login. Any credentials will work.
          </Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="md" py={12}>
      <Box p={8} boxShadow="lg" borderRadius="md" bg={bgColor}>
        <Heading mb={6} textAlign="center" color={textColor}>
          Welcome
        </Heading>

        {authError && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {authError}
          </Alert>
        )}

        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            style: {
              input: {
                borderRadius: '4px',
                fontSize: '16px',
                padding: '10px',
              },
              button: {
                borderRadius: '4px',
                fontSize: '16px',
                padding: '10px',
                background: '#3182CE',
                color: 'white',
              },
              anchor: {
                color: '#3182CE',
              }
            },
          }}
          theme="default"
          providers={['google', 'github']}
          redirectTo={`${window.location.origin}/dashboard`}
          magicLink={true}
          showLinks={true}
          view="sign_in"
        />
        
        <Divider my={4} />
        
        <Button 
          variant="outline" 
          colorScheme="blue" 
          width="100%" 
          onClick={() => setIsDemoMode(true)}
        >
          Try Demo Mode
        </Button>
        
        <Text mt={4} fontSize="sm" color="gray.500" textAlign="center">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </Box>
    </Container>
  );
};

export default SupabaseAuth; 