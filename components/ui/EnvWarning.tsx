import Link from 'next/link'

export default function EnvWarning() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Environment Setup Required</h2>
          <p className="mt-2 text-sm text-gray-600">
            Missing Supabase environment variables. Please configure your environment to use this application.
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Configuration needed</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Copy the <code className="bg-yellow-100 p-1 rounded">.env.example</code> file to <code className="bg-yellow-100 p-1 rounded">.env.local</code> and update with your Supabase credentials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
                Return to home
              </Link>
            </div>
            <div className="text-sm">
              <a href="https://github.com/tysongreenan/marduk-aeo#environment-variables" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="font-medium text-indigo-600 hover:text-indigo-500">
                View setup instructions
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 