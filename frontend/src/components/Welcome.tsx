import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Stack,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Textarea,
  List,
  ListItem,
  ListIcon,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { addBrand } from '../api';

interface WelcomeProps {
  onComplete: () => void;
}

export default function Welcome({ onComplete }: WelcomeProps) {
  const [brandName, setBrandName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  const handleSubmit = async () => {
    // Validate inputs
    if (!brandName.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter your brand name',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    if (!keywords.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter at least one keyword to monitor',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Call the API to save brand and keywords
      const response = await addBrand({
        brand_name: brandName.trim(),
        keywords: keywords.trim(),
      });
      
      if (response.success) {
        toast({
          title: 'Brand information saved',
          description: 'Your brand and keywords have been saved successfully',
          status: 'success',
          duration: 3000,
        });
        
        // Let the parent component know we're done
        onComplete();
      } else {
        setError(response.message || 'Failed to save brand information');
      }
    } catch (err: any) {
      console.error('Error saving brand info:', err);
      setError(err.message || 'An error occurred while saving your brand information');
      toast({
        title: 'Error',
        description: 'There was a problem saving your brand information',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxW="container.md" py={12}>
      <Box
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        bg="white"
      >
        <Heading as="h1" size="xl" mb={6} textAlign="center">
          Welcome to AI-Rank Booster!
        </Heading>
        
        <Text fontSize="lg" mb={8} textAlign="center">
          Ready to optimize your content for AI-generated answers? Let's get your brand set up.
        </Text>
        
        {error && (
          <Alert status="error" mb={6}>
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        <Box mb={8}>
          <Heading as="h2" size="md" mb={4}>
            How It Works
          </Heading>
          
          <List spacing={3}>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Enter your brand name and keywords you want to monitor
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              We'll regularly check these keywords in AI search results
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Monitor your dashboard for trends and alerts
            </ListItem>
          </List>
        </Box>
        
        <Divider my={6} />
        
        <Stack spacing={5}>
          <FormControl isRequired>
            <FormLabel>Enter your brand name</FormLabel>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g., Jane's Bakery"
            />
            <Text fontSize="sm" color="gray.600" mt={1}>
              This is how we'll identify your brand in AI responses
            </Text>
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel>Enter keywords to monitor (comma-separated)</FormLabel>
            <Textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., best bakery in Seattle, gluten-free bakery Seattle, artisan bread Seattle"
              rows={4}
            />
            <Text fontSize="sm" color="gray.600" mt={1}>
              These are the queries we'll use to check your brand's visibility in AI results
            </Text>
          </FormControl>
        </Stack>
        
        <Box mt={8} textAlign="center">
          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleSubmit}
            isLoading={isSaving}
            loadingText="Saving"
          >
            Get Started
          </Button>
        </Box>
      </Box>
    </Container>
  );
} 