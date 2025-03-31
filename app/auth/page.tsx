'use client'

import AuthForm from '../../components/auth/AuthForm'

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <AuthForm />
    </div>
  )
} 