import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  useToast,
} from '@chakra-ui/react';
import { generateReport } from '../api';

interface ReportGeneratorProps {
  brandName: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ brandName }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [includeOptions, setIncludeOptions] = useState({
    visibilityTrends: true,
    sentimentTrends: true,
    llmVisibility: true,
    topKeywords: true,
    avi: true,
    insights: true,
    competitors: true,
    sentiment: true,
    entityRecognition: true,
  });
  
  const toast = useToast();
  
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generateReport();
      
      if (result.success && result.url) {
        setReportUrl(result.url);
        
        toast({
          title: 'Report Generated',
          description: 'Your report has been successfully generated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Report Generation Failed',
          description: result.message || 'Failed to generate report',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('Error generating report:', err);
      toast({
        title: 'Error',
        description: 'An error occurred while generating the report',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDownload = () => {
    if (reportUrl) {
      // In a real implementation, this would trigger a download
      // For our mock, we'll just show a toast
      toast({
        title: 'Download Started',
        description: 'Your report is being downloaded',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleSendEmail = () => {
    if (!email.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // In a real implementation, this would send the email
    // For our mock, we'll just show a toast
    toast({
      title: 'Email Sent',
      description: `Report has been sent to ${email}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  const toggleOption = (option: keyof typeof includeOptions) => {
    setIncludeOptions({
      ...includeOptions,
      [option]: !includeOptions[option],
    });
  };
  
  return (
    <Box>
      <Button
        colorScheme="blue"
        size="lg"
        onClick={onOpen}
        width="100%"
      >
        Generate Report
      </Button>
      
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Generate PDF Report</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            {isGenerating ? (
              <VStack spacing={4} py={8}>
                <Spinner size="xl" />
                <Text>Generating comprehensive report for {brandName}...</Text>
                <Text fontSize="sm" color="gray.500">This may take a few moments</Text>
              </VStack>
            ) : reportUrl ? (
              <VStack spacing={6} py={4}>
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  Your report has been successfully generated!
                </Alert>
                
                <VStack spacing={4} width="100%">
                  <Button 
                    colorScheme="blue" 
                    width="100%"
                    onClick={handleDownload}
                  >
                    Download PDF
                  </Button>
                  
                  <Text fontWeight="medium" mt={2}>Or Send via Email:</Text>
                  
                  <FormControl>
                    <FormLabel>Email Address</FormLabel>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </FormControl>
                  
                  <Button 
                    colorScheme="green" 
                    width="100%"
                    onClick={handleSendEmail}
                  >
                    Send Report via Email
                  </Button>
                </VStack>
              </VStack>
            ) : (
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="sm" mb={3}>Report Options</Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Select the sections to include in your report:
                  </Text>
                  
                  <VStack align="stretch" spacing={2}>
                    <Checkbox 
                      isChecked={includeOptions.visibilityTrends} 
                      onChange={() => toggleOption('visibilityTrends')}
                    >
                      Visibility Trends
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.sentimentTrends} 
                      onChange={() => toggleOption('sentimentTrends')}
                    >
                      Sentiment Trends
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.llmVisibility} 
                      onChange={() => toggleOption('llmVisibility')}
                    >
                      LLM-Specific Visibility
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.topKeywords} 
                      onChange={() => toggleOption('topKeywords')}
                    >
                      Top-Ranking Keywords
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.avi} 
                      onChange={() => toggleOption('avi')}
                    >
                      AI Visibility Impact (AVI)
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.insights} 
                      onChange={() => toggleOption('insights')}
                    >
                      Insights & Recommendations
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.competitors} 
                      onChange={() => toggleOption('competitors')}
                    >
                      Competitor Analysis
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.sentiment} 
                      onChange={() => toggleOption('sentiment')}
                    >
                      Sentiment Analysis
                    </Checkbox>
                    
                    <Checkbox 
                      isChecked={includeOptions.entityRecognition} 
                      onChange={() => toggleOption('entityRecognition')}
                    >
                      Entity Recognition
                    </Checkbox>
                  </VStack>
                </Box>
                
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  The report will include all selected sections plus basic brand performance data.
                </Alert>
              </VStack>
            )}
          </ModalBody>
          
          <ModalFooter>
            {!reportUrl && !isGenerating && (
              <Button 
                colorScheme="blue" 
                mr={3} 
                onClick={handleGenerateReport}
                isDisabled={Object.values(includeOptions).every(option => !option)}
              >
                Generate Report
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ReportGenerator; 