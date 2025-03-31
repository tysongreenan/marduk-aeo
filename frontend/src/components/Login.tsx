import { useState } from 'react';
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
} from '@chakra-ui/react';
import { login } from '../api';
import type { LoginProps } from '../types';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('marketer@example.com'); // Pre-fill with test account
  const [password, setPassword] = useState('password123'); // Pre-fill with test password
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();

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
    <Container maxW="md" py={12}>
      <Box p={8} boxShadow="lg" borderRadius="md" bg="white">
        <Center mb={8}>
          <Heading size="lg">Dashboard Login</Heading>
        </Center>
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <FormControl id="email" isRequired>
              <FormLabel>Email</FormLabel>
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>
            
            <FormControl id="password" isRequired>
              <FormLabel>Password</FormLabel>
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            
            {errorMessage && (
              <Text color="red.500" mt={2}>
                {errorMessage}
              </Text>
            )}
            
            <Button 
              type="submit"
              colorScheme="blue"
              size="lg"
              mt={6}
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </Stack>
        </form>
      </Box>
    </Container>
  );
} 