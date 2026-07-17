import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Bouton } from '../../components/ui/Bouton'
import { MessageErreur } from '../../components/ui/MessageErreur'

// Connexion / inscription — email + mot de passe, messages en français simple.

export function AuthPage() {
  const navigate = useNavigate()
  const rechargerProfil = useAuthStore((s) => s.rechargerProfil)
  const [mode, setMode] = useState<'connexion' | 'inscription'>('inscription')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreurMsg(null)
    setChargement(true)
    try {
      if (mode === 'inscription') {
        const { error } = await supabase.auth.signUp({ email, password: motDePasse })
        if (error) throw error
        await rechargerProfil()
        navigate('/onboarding')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: motDePasse,
        })
        if (error) throw error
        await rechargerProfil()
        navigate('/accueil')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setErreurMsg(
        msg.includes('Invalid login')
          ? 'Email ou mot de passe incorrect.'
          : msg.includes('already registered')
            ? 'Un compte existe déjà avec cet email. Connecte-toi.'
            : msg.includes('at least 6')
              ? 'Ton mot de passe doit faire au moins 6 caractères.'
              : "Une erreur s'est produite. Vérifie ta connexion et réessaie."
      )
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-5">
      <Link to="/" className="mb-8 text-center text-2xl font-extrabold">
        Creator<span className="text-terracotta">X</span><span className="text-or"> AI</span>
      </Link>

      <h1 className="mb-1 text-2xl font-bold">
        {mode === 'inscription' ? 'Crée ton compte 🎁' : 'Content de te revoir 👋'}
      </h1>
      <p className="mb-6 text-encre-douce">
        {mode === 'inscription'
          ? '5 crédits offerts pour créer ta première pub.'
          : 'Connecte-toi pour retrouver tes pubs.'}
      </p>

      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Ton email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
          autoComplete="email"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Ton mot de passe (6 caractères min.)"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="rounded-2xl border border-encre/15 bg-carte px-4 py-3.5"
          autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
        />
        <MessageErreur message={erreurMsg} />
        <Bouton type="submit" pleineLargeur chargement={chargement}>
          {mode === 'inscription' ? 'Créer mon compte' : 'Me connecter'}
        </Bouton>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'inscription' ? 'connexion' : 'inscription')}
        className="mt-4 text-center text-sm font-semibold text-terracotta"
      >
        {mode === 'inscription'
          ? "J'ai déjà un compte → Me connecter"
          : "Pas encore de compte → M'inscrire gratuitement"}
      </button>
    </div>
  )
}
