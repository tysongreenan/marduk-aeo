'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../components/auth/AuthProvider'
import Link from 'next/link'

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  // Landing page for non-authenticated users
  return (
    <div className="relative isolate overflow-hidden bg-gray-900 min-h-screen">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-gray-900 to-black opacity-80"></div>
      </div>
      
      <div className="px-6 py-12 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Marduk AEO Platform
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Optimize your brand&apos;s visibility in AI-powered search engines and answer platforms.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold leading-6 text-white"
            >
              Sign up <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex lg:flex-1">
              <Link href="/" className="text-white font-bold text-xl">
                Marduk AEO
              </Link>
            </div>
            <div className="flex gap-x-6">
              <Link
                href="/login"
                className="text-sm font-semibold leading-6 text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold leading-6 text-white"
              >
                Sign up <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 