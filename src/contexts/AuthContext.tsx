import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getCurrentUser, getProfile } from '../lib/supabase'

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'patient' | 'doctor' | 'biller' | 'lab_technician' | 'admin'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await getProfile(userId)
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true;
    let hasInitialized = false;
    let timeoutId: NodeJS.Timeout;
    
    // Set a fallback timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && !hasInitialized) {
        console.warn('Auth initialization timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout
    
    // Check active sessions and sets the user
    getCurrentUser().then(async ({ user }) => {
      if (!isMounted || hasInitialized) return;
      
      hasInitialized = true;
      clearTimeout(timeoutId);
      setUser(user)
      if (user) {
        const profileData = await fetchProfile(user.id)
        if (isMounted) {
          setProfile(profileData)
        }
      } else {
        if (isMounted) {
          setProfile(null)
        }
      }
      if (isMounted) {
        setLoading(false)
      }
    })

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Only update if there's an actual change and we've already initialized
      if (hasInitialized && (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED')) {
        setUser(session?.user ?? null)
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (isMounted) {
            setProfile(profileData)
          }
        } else {
          if (isMounted) {
            setProfile(null)
          }
        }
        if (isMounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    profile,
    loading,
    signIn: async (email: string, password: string) => {
      // Clear any dummy user data when signing in with real credentials
      localStorage.removeItem('dummyUser')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      return { error }
    },
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 