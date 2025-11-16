import React from 'react'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import UserProgressDashboard from '../components/UserProgressDashboard'

const Dashboard: React.FC = () => {
  const { user, loading, loggedOut, signOut } = useUser({ redirect: '/signin' })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
        <span className="ml-3 text-lg">Cargando...</span>
      </div>
    )
  }

  if (loggedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Redirigiendo al login...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />
      
      <main className="py-8">
        <UserProgressDashboard userId="e41b0d72-62bc-48af-9dff-40c2c7bb1029" />
      </main>
    </div>
  )
}

export default Dashboard