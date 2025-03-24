'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/auth/AuthProvider'
import Link from 'next/link'
import EnvWarning from '../../components/ui/EnvWarning'

// Define the Brand type for better type safety
interface Brand {
  id: string
  name: string
  industry?: string
}

export default function DashboardPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEnvReady, setIsEnvReady] = useState(false)
  const router = useRouter()
  const { user, signOut } = useAuth()

  useEffect(() => {
    // Check if the Supabase environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    setIsEnvReady(!!supabaseUrl && !!supabaseAnonKey)
    
    if (!user && !!supabaseUrl && !!supabaseAnonKey) {
      router.push('/login')
      return
    }
    
    // Load user brands
    const fetchBrands = async () => {
      // In a real app, this would fetch brands from the database
      // For now, we'll just use mock data
      const mockBrands: Brand[] = [
        { id: '1', name: 'Acme Corp', industry: 'Technology' },
        { id: '2', name: 'Global Foods', industry: 'Food & Beverage' }
      ]
      
      setBrands(mockBrands)
      setIsLoading(false)
    }
    
    if (user) {
      fetchBrands()
    } else {
      setIsLoading(false)
    }
  }, [user, router])
  
  if (!isEnvReady) {
    return <EnvWarning />
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Brands</h1>
        
        {brands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map(brand => (
              <div 
                key={brand.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium text-gray-900">{brand.name}</h3>
                {brand.industry && (
                  <p className="text-sm text-gray-500 mt-1">{brand.industry}</p>
                )}
                <div className="mt-4">
                  <Link 
                    href={`/dashboard/brand/${brand.id}`}
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            ))}
            
            <div className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-gray-400 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Add New Brand</h3>
              <p className="text-sm text-gray-500 mt-1">Track another brand's performance</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No brands yet</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">Start tracking your brand's performance in AI-powered search results by adding your first brand.</p>
            <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Add your first brand
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 