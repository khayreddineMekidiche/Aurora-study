import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type SignUpResult = {
  needsEmailConfirmation: boolean
}

export type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
