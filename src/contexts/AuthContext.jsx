import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

  const loadProfile = useCallback(async (id, email) => {
    if (!supabase || !id) {
      setProfile(null)
      return
    }
    setProfileLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()

    if (error) {
      setProfileLoading(false)
      return
    }
    if (!data) {
      // Profile missing (e.g. account created before the trigger existed).
      // upsert keeps this safe when the effect runs twice for the same user.
      const { error: insErr } = await supabase
        .from('profiles')
        .upsert({ id, email: email || '' }, { onConflict: 'id', ignoreDuplicates: true })
      if (!insErr) {
        const { data: created } = await supabase.from('profiles').select('*').eq('id', id).single()
        setProfile(created)
      }
    } else {
      setProfile(data)
    }
    setProfileLoading(false)
  }, [])

  useEffect(() => {
    loadProfile(user?.id, user?.email)
  }, [user?.id, user?.email, loadProfile])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      profileLoading,
      signIn,
      signOut,
      refreshProfile: () => loadProfile(user?.id, user?.email),
    }),
    [user, profile, loading, profileLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}