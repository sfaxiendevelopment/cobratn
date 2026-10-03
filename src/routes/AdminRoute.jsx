import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import FullPageLoader from '../components/FullPageLoader'

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || (user && profileLoading)) return <FullPageLoader />

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  // Authorization is also enforced server-side via Supabase RLS —
  // this guard is just the UI layer.
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
