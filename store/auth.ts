import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

type User = { id: string; email: string; name?: string; avatar?: string }

type AuthState = {
  token?: string
  user?: User
  setSession: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: undefined,
  user: undefined,
  setSession: (token, user) => {
    set({ token, user })
    AsyncStorage.setItem('session', JSON.stringify({ token, user })).catch(() => {})
  },
  logout: () => {
    set({ token: undefined, user: undefined })
    AsyncStorage.removeItem('session').catch(() => {})
  }
}))