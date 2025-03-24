'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/auth/AuthProvider'
import Link from 'next/link'

// Define the Brand type
interface Brand {
  id: string
  name: string
  industry?: string
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandsLoading, setBrandsLoading] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (user) {
      // Fetch brands
      const fetchBrands = async () => {
        setBrandsLoading(true)
        try {
          // This would be replaced with a real API call
          // e.g., const { data } = await fetch('/api/brands')
          const mockBrands = [
            { id: '1', name: 'Example Brand', industry: 'Technology' },
            { id: '2', name: 'Test Company', industry: 'Retail' },
          ]
          setBrands(mockBrands)
        } catch (error) {
          console.error('Failed to fetch brands')
        } finally {
          setBrandsLoading(false)
        }
      }
      
      fetchBrands()
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your Marduk AEO dashboard.</p>
      </div>
      
      {user && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Account</h2>
          <p>Signed in as: <span className="font-medium">{user.email}</span></p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Brands</h2>
          <Link
            href="/dashboard/brands/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 text-sm font-medium"
          >
            Add Brand
          </Link>
        </div>
        
        {brandsLoading ? (
          <p>Loading brands...</p>
        ) : brands.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/dashboard/brands/${brand.id}`}
                className="block p-4 border rounded-md hover:border-indigo-300 hover:bg-indigo-50"
              >
                <h3 className="font-medium">{brand.name}</h3>
                {brand.industry && (
                  <p className="text-sm text-gray-500">{brand.industry}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You don&apos;t have any brands yet.</p>
            <p className="text-sm text-gray-400">
              Add your first brand to start tracking its presence in AI search results.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 