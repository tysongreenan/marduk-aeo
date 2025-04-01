'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// This is the frontend URL for the Vite app
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:5173'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the frontend Vite app
    window.location.href = FRONTEND_URL
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Loading dashboard...</h2>
        <p className="mt-2 text-sm text-gray-600">Redirecting to the main dashboard application</p>
      </div>
    </div>
  )
} 