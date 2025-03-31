import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Stack,
  Text,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Card,
  CardBody,
  CardHeader,
  HStack,
  Divider
} from '@chakra-ui/react';

export default function Dashboard() {
  // Static demo data to display in the dashboard
  const demoData = {
    totalQueries: 2450,
    averageRanking: 3.2,
    keyphraseCount: 18,
    positiveRatio: 82,
    weeklyChange: 15,
    brandMentions: 128,
    alertsTriggered: 3,
    brandName: "Acme Corporation"
  };

  return (
    <Container maxW="container.xl" py={6}>
      <Stack spacing={6}>
        <Box>
          <Heading as="h1" size="xl" mb={2}>
            Dashboard
          </Heading>
          <Text color="gray.600">
            Welcome to your AI-Rank Booster dashboard, showing your performance overview
          </Text>
        </Box>

        <Card variant="outline">
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Performance Overview</Heading>
              <Badge colorScheme="green">Demo Mode</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
              <Stat>
                <StatLabel>Query Rankings</StatLabel>
                <StatNumber>{demoData.totalQueries}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  {demoData.weeklyChange}% since last week
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Average Position</StatLabel>
                <StatNumber>{demoData.averageRanking}</StatNumber>
                <StatHelpText>
                  <StatArrow type="decrease" />
                  0.5 since last month
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Brand Mentions</StatLabel>
                <StatNumber>{demoData.brandMentions}</StatNumber>
                <StatHelpText>
                  Across all monitored queries
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Sentiment Score</StatLabel>
                <StatNumber>{demoData.positiveRatio}%</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  3% since last month
                </StatHelpText>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Card variant="outline">
            <CardHeader>
              <Heading size="md">Recent Alerts</Heading>
            </CardHeader>
            <CardBody>
              <Stack spacing={3}>
                <Box p={3} borderRadius="md" bg="yellow.50">
                  <Text fontWeight="bold">Ranking Change Alert</Text>
                  <Text fontSize="sm">
                    {demoData.brandName} dropped from position 2 to 5 for "enterprise software solutions"
                  </Text>
                  <Text fontSize="xs" color="gray.500">Today, 9:45 AM</Text>
                </Box>
                <Box p={3} borderRadius="md" bg="green.50">
                  <Text fontWeight="bold">Sentiment Improvement</Text>
                  <Text fontSize="sm">
                    Positive sentiment increased by 8% for "customer support software"
                  </Text>
                  <Text fontSize="xs" color="gray.500">Yesterday, 3:20 PM</Text>
                </Box>
                <Box p={3} borderRadius="md" bg="red.50">
                  <Text fontWeight="bold">Competitor Alert</Text>
                  <Text fontSize="sm">
                    New competitor detected in top 3 positions for "cloud CRM solutions"
                  </Text>
                  <Text fontSize="xs" color="gray.500">2 days ago</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          <Card variant="outline">
            <CardHeader>
              <Heading size="md">Top Performing Keywords</Heading>
            </CardHeader>
            <CardBody>
              <Stack spacing={2} divider={<Divider />}>
                <HStack justify="space-between">
                  <Text>enterprise software</Text>
                  <Badge colorScheme="green">Position 1</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>project management tools</Text>
                  <Badge colorScheme="green">Position 2</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>team collaboration software</Text>
                  <Badge colorScheme="green">Position 2</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>small business CRM</Text>
                  <Badge colorScheme="blue">Position 4</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>customer support software</Text>
                  <Badge colorScheme="blue">Position 5</Badge>
                </HStack>
              </Stack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
} 