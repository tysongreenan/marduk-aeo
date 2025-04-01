import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, Box, Text, Spinner, Center } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import { isAuthenticated } from './utils/supabase'

// Error boundary component to catch auth errors
const AppWithErrorHandling = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const authed = await isAuthenticated()
        setAuthenticated(authed)
        setLoading(false)
      } catch (err) {
        console.error('Authentication check failed:', err)
        setError('Failed to connect to authentication service. Please try again later.')
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    )
  }

  if (error) {
    return (
      <Center height="100vh" p={4}>
        <Box textAlign="center" p={8} borderRadius="md" bg="red.50" borderWidth={1} borderColor="red.200">
          <Text color="red.500" fontSize="lg" fontWeight="bold">
            {error}
          </Text>
          <Text mt={2}>
            The application encountered an error connecting to the authentication service.
            Please refresh the page or try again later.
          </Text>
        </Box>
      </Center>
    )
  }

  // Handle the case where we're using the mock client in development
  const bypassEnvCheck = import.meta.env.VITE_BYPASS_ENV_CHECK === 'true'
  if (bypassEnvCheck) {
    return <App />
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider>
      <AppWithErrorHandling />
    </ChakraProvider>
  </StrictMode>,
)
