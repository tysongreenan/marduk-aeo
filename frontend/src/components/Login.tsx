import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Center,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  useToast,
  Text,
  Alert,
  AlertIcon,
  Badge,
  Flex,
  Link,
  Divider,
} from '@chakra-ui/react';
import { login } from '../api';
import type { LoginProps } from '../types';

const isMockMode = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const bypassEnvCheck = import.meta.env.VITE_BYPASS_ENV_CHECK === 'true';
  
  return (!supabaseUrl || !supabaseAnonKey || 
          supabaseUrl.includes('your-project-ref') || 
          supabaseAnonKey.includes('your-anon-key') || 
          !bypassEnvCheck);
};

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState(import.meta.env.VITE_DASHBOARD_USERNAME || 'test@example.com');
  const [password, setPassword] = useState(import.meta.env.VITE_DASHBOARD_PASSWORD || 'password123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mockMode, setMockMode] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMockMode(isMockMode());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    console.log('Attempting login with:', { email });

    try {
      const success = await login(email, password);
      
      if (success) {
        console.log('Login successful');
        toast({
          title: 'Login successful',
          status: 'success',
          duration: 2000,
        });
        onLoginSuccess();
      } else {
        console.error('Login returned false');
        setErrorMessage('Invalid email or password');
        toast({
          title: 'Login failed',
          description: 'Invalid email or password',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An error occurred during login');
      toast({
        title: 'Login error',
        description: 'An error occurred during login',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="md" py={12}>
        <Flex direction="column" align="center" mb={8}>
          <Heading size="xl" fontWeight="bold" color="blue.500" mb={2}>
            Marduk AEO
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Sign in to your account
          </Text>
        </Flex>

        <Box bg="white" p={8} boxShadow="md" borderRadius="md">
          {mockMode && (
            <Alert status="info" mb={6} borderRadius="md">
              <AlertIcon />
              <Box>
                <Badge colorScheme="purple" mb={1}>MOCK MODE</Badge>
                <Text fontSize="sm">
                  Using test data. For real authentication, update your Supabase credentials in .env.
                </Text>
              </Box>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Stack spacing={6}>
              <FormControl id="email">
                <FormLabel>Email address</FormLabel>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg="gray.50"
                  borderColor="gray.300"
                  size="lg"
                />
                {mockMode && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Any email will work in mock mode
                  </Text>
                )}
              </FormControl>
              
              <FormControl id="password">
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  bg="gray.50"
                  borderColor="gray.300"
                  size="lg"
                />
                {mockMode && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Any password will work in mock mode
                  </Text>
                )}
              </FormControl>
              
              {errorMessage && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {errorMessage}
                </Alert>
              )}
              
              <Button 
                type="submit"
                colorScheme="blue" 
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="Signing in"
              >
                Sign in
              </Button>
              
              <Divider />
              
              <Box textAlign="center">
                <Text mb={2}>Don't have an account?</Text>
                <Link color="blue.500" onClick={() => alert("Sign up would go here")}>
                  Create an account
                </Link>
              </Box>
            </Stack>
          </form>
        </Box>
      </Container>
    </Box>
  );
} 