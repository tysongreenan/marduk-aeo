'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/auth/AuthProvider'
import Link from 'next/link'

// Define a Brand type
interface Brand {
  id: string
  name: string
  industry?: string
}

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth()
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingBrands, setLoadingBrands] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Fetch brands when user is authenticated
  useEffect(() => {
    const fetchBrands = async () => {
      if (user) {
        try {
          // Fetch brands using server actions (to be implemented)
          // const userBrands = await getBrands(user.id)
          // setBrands(userBrands)
          
          // Temporary placeholder data
          setBrands([
            { id: '1', name: 'Sample Brand 1', industry: 'Technology' },
            { id: '2', name: 'Sample Brand 2', industry: 'Healthcare' }
          ])
          setLoadingBrands(false)
        } catch (error) {
          console.error('Error fetching brands:', error)
          setLoadingBrands(false)
        }
      }
    }

    if (user) {
      fetchBrands()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  // User should be redirected if not authenticated, but this is a fallback
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <div>
            <span className="mr-4 text-sm">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Your Brands</h2>
          
          {loadingBrands ? (
            <p>Loading brands...</p>
          ) : brands.length === 0 ? (
            <div className="text-center py-6">
              <p className="mb-4">You haven't added any brands yet.</p>
              <Link
                href="/brands/new"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Add Your First Brand
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <div key={brand.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <h3 className="font-medium text-lg">{brand.name}</h3>
                  <p className="text-gray-500">{brand.industry}</p>
                  <div className="mt-4">
                    <Link
                      href={`/brands/${brand.id}`}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
              
              <div className="border rounded-lg p-4 flex items-center justify-center hover:shadow-md transition border-dashed">
                <Link
                  href="/brands/new"
                  className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center"
                >
                  <span className="mr-2 text-xl">+</span> Add New Brand
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 