import { notFound } from 'next/navigation'

// This is a catch-all route for handling 404s
export default function NotFoundCatchAll() {
  // This will trigger the closest not-found.tsx
  notFound()
}

// Disable static generation for this route
export const dynamic = 'force-dynamic'

// Generate no static paths
export async function generateStaticParams() {
  return []
} 