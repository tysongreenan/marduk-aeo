'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SettingsLayout({ children }) {
  const pathname = usePathname()
  
  const isActive = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }
  
  const navItems = [
    { name: 'Brands', href: '/dashboard/settings/brands' },
    { name: 'Topics', href: '/dashboard/settings/topics' },
    { name: 'Account', href: '/dashboard/settings/account' },
  ]
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
        <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium ${
                  isActive(item.href)
                    ? 'bg-gray-50 text-blue-600 hover:bg-gray-50 hover:text-blue-600'
                    : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>
        
        <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
          {children}
        </div>
      </div>
    </div>
  )
} 