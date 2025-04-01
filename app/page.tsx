'use client'

import { useState } from 'react'
import Link from 'next/link'
import '../app/globals.css'

// Define the frontend URL for Vite app links
const FRONTEND_URL = 'https://marduk-aeo-frontend.onrender.com';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav style={{backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'}}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', height: '4rem', alignItems: 'center'}}>
            <div style={{display: 'flex'}}>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1c64f2'}}>Marduk AEO</span>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <a
                href={`${FRONTEND_URL}/login`}
                style={{color: '#4b5563', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none'}}
              >
                Log in
              </a>
              <a
                href={`${FRONTEND_URL}/signup`}
                style={{backgroundColor: '#1c64f2', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none'}}
              >
                Sign up
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{maxWidth: '80rem', margin: '0 auto', padding: '3rem 1rem'}}>
        <div style={{textAlign: 'center'}}>
          <h1 style={{fontSize: '2.5rem', fontWeight: '800', color: '#111827', lineHeight: '1.2'}}>
            <span style={{display: 'block'}}>Track Your Brand Visibility</span>
            <span style={{display: 'block', color: '#1c64f2'}}>in AI Search Results</span>
          </h1>
          <p style={{marginTop: '1rem', maxWidth: '28rem', margin: '0 auto', color: '#6b7280', fontSize: '1.125rem', lineHeight: '1.75rem'}}>
            Monitor and analyze how your brand appears in AI-powered search results. Get insights, track mentions, and stay ahead of the competition.
          </p>
          <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap'}}>
            <div style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', borderRadius: '0.375rem'}}>
              <a
                href={`${FRONTEND_URL}`}
                style={{
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  padding: '0.75rem 2rem', 
                  borderRadius: '0.375rem', 
                  backgroundColor: '#1c64f2', 
                  color: 'white', 
                  fontWeight: '500',
                  textDecoration: 'none',
                  minWidth: '10rem'
                }}
              >
                View Demo Dashboard
              </a>
            </div>
            <div style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', borderRadius: '0.375rem'}}>
              <a
                href="https://forms.gle/RkxkWNQDpS3YCb8WA"
                style={{
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  padding: '0.75rem 2rem', 
                  borderRadius: '0.375rem', 
                  backgroundColor: 'white', 
                  color: '#1c64f2', 
                  fontWeight: '500',
                  textDecoration: 'none',
                  minWidth: '10rem'
                }}
              >
                Request Access
              </a>
            </div>
            <div style={{
              marginTop: '2rem', 
              padding: '1rem', 
              backgroundColor: '#fef3c7', 
              borderRadius: '0.5rem',
              width: '100%',
              maxWidth: '32rem',
              margin: '2rem auto',
              border: '1px solid #fcd34d'
            }}>
              <p style={{fontSize: '0.875rem', color: '#92400e', textAlign: 'center'}}>
                <strong>For Investors Demo:</strong> Use demo@example.com / password123 to instantly access the dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{backgroundColor: 'white', marginTop: 'auto'}}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '3rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div>
            <p style={{textAlign: 'center', fontSize: '0.875rem', color: '#9ca3af'}}>
              &copy; {new Date().getFullYear()} Marduk AEO. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 