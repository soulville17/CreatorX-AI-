import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

// Store global d'authentification (Zustand).
// Charge la session Supabase + le profil (solde de crédits inclus).

interface AuthState {
  session: Session | null
  profile: Profile | null
  chargement: boolean
  initialiser: () => Promise<void>
  rechargerProfil: () => Promise<void>
  deconnexion: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  chargement: true,

  // Appelé une seule fois au démarrage de l'application
  initialiser: async () => {
    const { data } = await supabase.auth.getSession()
    set({ session: data.session })
    if (data.session) await get().rechargerProfil()
    set({ chargement: false })

    // Écoute les changements de session (connexion, déconnexion, expiration)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session })
      if (session) await get().rechargerProfil()
      else set({ profile: null })
    })
  },

  // Recharge le profil — à appeler après un achat de crédits ou une génération
  rechargerProfil: async () => {
    const session = get().session ?? (await supabase.auth.getSession()).data.session
    if (!session) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
    set({ profile: (data as Profile) ?? null })
  },

  deconnexion: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))
