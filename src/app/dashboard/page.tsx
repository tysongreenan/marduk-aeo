import Link from 'next/link';

export default function DashboardHome() {
  // Sample data for dashboard stats
  const stats = [
    { label: 'Brands', value: 3, icon: '🏢', link: '/dashboard/brands' },
    { label: 'Keywords', value: 124, icon: '🔍', link: '/dashboard/keywords' },
    { label: 'Competitors', value: 8, icon: '🥊', link: '/dashboard/competitors' },
    { label: 'Templates', value: 12, icon: '📝', link: '/dashboard/prompt-templates' },
  ];

  // Sample data for recent activity
  const activities = [
    { id: 1, type: 'keyword_query', name: 'Best project management software', date: '1 hour ago' },
    { id: 2, type: 'competitor_added', name: 'Asana', date: '3 hours ago' },
    { id: 3, type: 'template_created', name: 'Product Comparison Template', date: '1 day ago' },
    { id: 4, type: 'recommendation', name: 'Create more case studies for SEO', date: '2 days ago' },
    { id: 5, type: 'keyword_query', name: 'How to increase organic search visibility', date: '3 days ago' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/brands/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Brand
          </Link>
          <Link
            href="/dashboard/keywords/new"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Keywords
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.link}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="text-3xl">{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-gray-500">{stat.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="divide-y">
          {activities.map((activity) => (
            <div key={activity.id} className="py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{activity.name}</div>
                <div className="text-sm text-gray-500">
                  {getActivityTypeLabel(activity.type)}
                </div>
              </div>
              <div className="text-sm text-gray-500">{activity.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border rounded-md hover:bg-gray-50 flex flex-col items-center text-center">
            <svg className="w-8 h-8 mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Run Keyword Analysis</span>
          </button>
          <button className="p-4 border rounded-md hover:bg-gray-50 flex flex-col items-center text-center">
            <svg className="w-8 h-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Generate Report</span>
          </button>
          <button className="p-4 border rounded-md hover:bg-gray-50 flex flex-col items-center text-center">
            <svg className="w-8 h-8 mb-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span>Share Results</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to get a human-readable label for activity types
function getActivityTypeLabel(type: string): string {
  switch (type) {
    case 'keyword_query':
      return 'Keyword Query';
    case 'competitor_added':
      return 'Competitor Added';
    case 'template_created':
      return 'Template Created';
    case 'recommendation':
      return 'Recommendation';
    default:
      return type;
  }
}

// Add this line at the end of the file to force dynamic rendering
export const dynamic = 'force-dynamic'; 