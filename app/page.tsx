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
      
      <div className="px-6 lg:px-8">
        <nav className="flex items-center justify-between pt-6" aria-label="Global">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5">
              <span className="text-xl font-bold text-white">Marduk AEO</span>
            </a>
          </div>
          <div className="flex gap-x-4 lg:gap-x-6">
            <Link href="/login" className="text-sm font-semibold leading-6 text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Sign up
            </Link>
          </div>
        </nav>

        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Answer Engine Optimization Platform
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Optimize your brand's presence in AI-driven answer engines.
              Track keywords, analyze source influence, and shape narratives.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Get started
              </Link>
              <Link href="/login" className="text-sm font-semibold leading-6 text-white">
                Already have an account? <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 