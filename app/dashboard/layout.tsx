import Sidebar from '../../components/navigation/Sidebar'
import Header from '../../components/navigation/Header'
import { redirect } from 'next/navigation'
import { createServerClient } from '../../src/lib/supabase/client'
import EnvWarning from '../../components/ui/EnvWarning'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if Supabase environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // If environment variables are not available, show a configuration message
  if (!supabaseUrl || !supabaseAnonKey) {
    return <EnvWarning />
  }
  
  // Check auth on server side
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/')
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 