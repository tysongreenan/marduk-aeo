'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Brands', path: '/dashboard/brands' },
    { name: 'Keywords', path: '/dashboard/keywords' },
    { name: 'Competitors', path: '/dashboard/competitors' },
    { name: 'Prompt Templates', path: '/dashboard/prompt-templates' },
    { name: 'Settings', path: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold">
            Marduk AEO
          </Link>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-medium">TG</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 flex">
        {/* Sidebar */}
        <aside className="w-64 mr-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {navItems.map((item) => {
                const isActive = 
                  item.path === '/dashboard' 
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.path);
                
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`block px-4 py-3 hover:bg-gray-50 ${
                        isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
} 