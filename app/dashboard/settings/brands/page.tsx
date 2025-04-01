'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Mark this page as a dynamic route
export const dynamic = 'force-dynamic'

export default function BrandsSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard - this is just a placeholder page
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Loading dashboard...</h2>
      </div>
    </div>
  )
} 