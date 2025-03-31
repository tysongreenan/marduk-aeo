import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Text,
  Heading,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Container,
} from '@chakra-ui/react';
import { login, signup } from '../api';
import type { AuthProps, LoginFormData, SignupFormData } from '../types';

// Custom hook for form validation
const useFormValidation = (initialValues: Record<string, string>, validators: Record<string, (value: string) => { valid: boolean; message: string }>) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Sanitize input to prevent XSS
    const sanitizedValue = value.replace(/<[^>]*>/g, '');
    
    setValues({ ...values, [name]: sanitizedValue });
    
    // Validate on change
    if (touched[name]) {
      const validator = validators[name];
      if (validator) {
        const result = validator(sanitizedValue);
        setErrors(prev => ({ ...prev, [name]: result.valid ? '' : result.message }));
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    
    const validator = validators[name];
    if (validator) {
      const result = validator(value);
      setErrors(prev => ({ ...prev, [name]: result.valid ? '' : result.message }));
    }
  };

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    Object.entries(validators).forEach(([name, validator]) => {
      const result = validator(values[name] || '');
      if (!result.valid) {
        newErrors[name] = result.message;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };

  return { values, errors, touched, handleChange, handleBlur, validateAll, setValues };
};

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const toast = useToast();

  // Validators
  const validators = {
    email: (value: string) => ({
      valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Please enter a valid email address',
    }),
    password: (value: string) => ({
      valid: value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value),
      message: 'Password must be at least 8 characters with at least one uppercase letter and one number',
    }),
    confirmPassword: (value: string) => ({
      valid: value === loginForm.values.password,
      message: 'Passwords do not match',
    }),
    organization_name: (value: string) => ({
      valid: value.length >= 3,
      message: 'Organization name must be at least 3 characters',
    }),
  };

  const loginForm = useFormValidation(
    { email: '', password: '' },
    { email: validators.email, password: validators.password }
  );

  const signupForm = useFormValidation(
    { email: '', password: '', confirmPassword: '', organization_name: '' },
    {
      email: validators.email,
      password: validators.password,
      confirmPassword: validators.confirmPassword,
      organization_name: validators.organization_name,
    }
  );

  useEffect(() => {
    // Check for 'login_hint' parameter in URL for SSO flows
    const urlParams = new URLSearchParams(window.location.search);
    const loginHint = urlParams.get('login_hint');
    
    if (loginHint) {
      loginForm.setValues({ ...loginForm.values, email: loginHint });
      // This would be extended for SSO integrations
    }
    
    // Clear sensitive info when component unmounts
    return () => {
      loginForm.setValues({ email: '', password: '' });
      signupForm.setValues({ email: '', password: '', confirmPassword: '', organization_name: '' });
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!loginForm.validateAll()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Rate limiting on client side to prevent brute force
      const lastAttempt = sessionStorage.getItem('last_login_attempt');
      const now = Date.now();
      
      if (lastAttempt && (now - parseInt(lastAttempt)) < 1000) {
        throw new Error('Please wait before trying again');
      }
      
      sessionStorage.setItem('last_login_attempt', now.toString());
      
      const success = await login(loginForm.values.email, loginForm.values.password);
      
      if (success) {
        // Clear sensitive data
        loginForm.setValues({ email: '', password: '' });
        
        onAuthSuccess();
        
        toast({
          title: 'Login successful',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        setAuthError('Invalid email or password');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!signupForm.validateAll()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const signupData: SignupFormData = {
        email: signupForm.values.email,
        password: signupForm.values.password,
        confirmPassword: signupForm.values.confirmPassword,
        organization_name: signupForm.values.organization_name,
      };
      
      const response = await signup(signupData);
      
      if (response && response.access_token) {
        // Clear sensitive data
        signupForm.setValues({ email: '', password: '', confirmPassword: '', organization_name: '' });
        
        onAuthSuccess();
        
        toast({
          title: 'Account created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        setAuthError('Signup failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setAuthError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  
  const bgColor = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.200');

  return (
    <Container maxW="md" py={12}>
      <Box p={8} boxShadow="lg" borderRadius="md" bg={bgColor}>
        <Heading mb={6} textAlign="center" color={textColor}>AI-Rank Booster</Heading>
        
        {authError && (
          <Alert status="error" mb="4" borderRadius="md">
            <AlertIcon />
            {authError}
          </Alert>
        )}
        
        <Tabs isFitted index={tabIndex} onChange={(index) => {
          setTabIndex(index);
          setAuthError(null);
        }}>
          <TabList mb="4">
            <Tab>Login</Tab>
            <Tab>Sign Up</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel p="0">
              <form onSubmit={handleLoginSubmit} id="login-form">
                <Stack spacing="4">
                  <FormControl isInvalid={!!loginForm.errors.email && loginForm.touched.email}>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={loginForm.values.email}
                      onChange={loginForm.handleChange}
                      onBlur={loginForm.handleBlur}
                      autoFocus
                      isRequired
                      data-testid="login-email"
                    />
                    <FormErrorMessage>{loginForm.errors.email}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!loginForm.errors.password && loginForm.touched.password}>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <InputGroup>
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={loginForm.values.password}
                        onChange={loginForm.handleChange}
                        onBlur={loginForm.handleBlur}
                        isRequired
                        data-testid="login-password"
                      />
                      <InputRightElement width="4.5rem">
                        <Button h="1.75rem" size="sm" onClick={togglePasswordVisibility}>
                          {showPassword ? "Hide" : "Show"}
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{loginForm.errors.password}</FormErrorMessage>
                  </FormControl>
                  
                  <Button
                    colorScheme="blue"
                    type="submit"
                    isLoading={isSubmitting}
                    data-testid="login-submit"
                  >
                    Login
                  </Button>
                </Stack>
              </form>
            </TabPanel>
            
            <TabPanel p="0">
              <form onSubmit={handleSignupSubmit} id="signup-form">
                <Stack spacing="4">
                  <FormControl isInvalid={!!signupForm.errors.email && signupForm.touched.email}>
                    <FormLabel htmlFor="signup-email">Email</FormLabel>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={signupForm.values.email}
                      onChange={signupForm.handleChange}
                      onBlur={signupForm.handleBlur}
                      isRequired
                      data-testid="signup-email"
                    />
                    <FormErrorMessage>{signupForm.errors.email}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!signupForm.errors.organization_name && signupForm.touched.organization_name}>
                    <FormLabel htmlFor="organization_name">Organization Name</FormLabel>
                    <Input
                      id="organization_name"
                      name="organization_name"
                      type="text"
                      autoComplete="organization"
                      value={signupForm.values.organization_name}
                      onChange={signupForm.handleChange}
                      onBlur={signupForm.handleBlur}
                      isRequired
                      data-testid="signup-org"
                    />
                    <FormErrorMessage>{signupForm.errors.organization_name}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!signupForm.errors.password && signupForm.touched.password}>
                    <FormLabel htmlFor="signup-password">Password</FormLabel>
                    <InputGroup>
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={signupForm.values.password}
                        onChange={signupForm.handleChange}
                        onBlur={signupForm.handleBlur}
                        isRequired
                        data-testid="signup-password"
                      />
                      <InputRightElement width="4.5rem">
                        <Button h="1.75rem" size="sm" onClick={togglePasswordVisibility}>
                          {showPassword ? "Hide" : "Show"}
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{signupForm.errors.password}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isInvalid={!!signupForm.errors.confirmPassword && signupForm.touched.confirmPassword}>
                    <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                    <InputGroup>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={signupForm.values.confirmPassword}
                        onChange={signupForm.handleChange}
                        onBlur={signupForm.handleBlur}
                        isRequired
                        data-testid="signup-confirm"
                      />
                      <InputRightElement width="4.5rem">
                        <Button h="1.75rem" size="sm" onClick={toggleConfirmPasswordVisibility}>
                          {showConfirmPassword ? "Hide" : "Show"}
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>{signupForm.errors.confirmPassword}</FormErrorMessage>
                  </FormControl>
                  
                  <Button
                    colorScheme="blue"
                    type="submit"
                    isLoading={isSubmitting}
                    data-testid="signup-submit"
                  >
                    Sign Up
                  </Button>
                </Stack>
              </form>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
};

export default Auth; 