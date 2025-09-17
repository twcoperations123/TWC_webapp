import React from 'react'
import { isDemoMode } from '../lib/supabase'

export const DemoBanner: React.FC = () => {
  if (!isDemoMode) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        <span className="animate-pulse">🎭</span>
        <span className="font-medium">DEMO MODE</span>
        <span>|</span>
        <span>Try login: <strong>user/password</strong> or <strong>admin/admin123</strong></span>
        <span>|</span>
        <span>🚧 Database mocked for testing</span>
      </div>
    </div>
  )
}
