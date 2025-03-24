import Sidebar from '../../components/navigation/Sidebar'
import Header from '../../components/navigation/Header'
import { redirect } from 'next/navigation'
import { createServerClient } from '../../src/lib/supabase/client'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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