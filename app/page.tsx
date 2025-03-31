'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../components/auth/AuthProvider'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const { user, loading, error, isEnvironmentReady } = useAuth()
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    // Only redirect if we're not loading and have a valid user
    if (!loading && user) {
      router.push('/dashboard')
    }
    
    // Show error message after a delay if environment is not ready
    if (!loading && !isEnvironmentReady) {
      const timer = setTimeout(() => setShowError(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [loading, user, router, isEnvironmentReady])

  // Loading state with improved messaging
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
          <p className="mt-2 text-sm text-gray-600">Please wait while we set up your experience</p>
        </div>
      </div>
    )
  }

  // Error state with helpful message
  if (error || (showError && !isEnvironmentReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              {!isEnvironmentReady ? 'Configuration Required' : 'Something went wrong'}
            </h2>
            <p className="text-gray-600 mb-6">
              {!isEnvironmentReady ? (
                <>
                  The application requires proper configuration to function. Please make sure all environment variables are set correctly.
                  <br /><br />
                  Required variables:
                  <ul className="list-disc text-left pl-6 mt-2">
                    <li>NEXT_PUBLIC_SUPABASE_URL</li>
                    <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                  </ul>
                </>
              ) : (
                error?.message || 'An unexpected error occurred. Please try again later.'
              )}
            </p>
            <div className="mt-4">
              <Link
                href="https://github.com/tysongreenan/marduk-aeo#environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                View Setup Instructions →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-primary-600">Marduk AEO</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Track Your Brand Visibility</span>
            <span className="block text-primary-600">in AI Search Results</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Monitor and analyze how your brand appears in AI-powered search results. Get insights, track mentions, and stay ahead of the competition.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href="/signup"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link
                href="/login"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="mt-8 md:mt-0">
            <p className="text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} Marduk AEO. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 