// Types TypeScript reflétant le schéma Supabase (voir supabase/migrations).

export type TypeActivite =
  | 'mode'
  | 'cosmetiques'
  | 'alimentation'
  | 'restaurant'
  | 'beaute'
  | 'sante'
  | 'auto'
  | 'immobilier'
  | 'formation'
  | 'services'
  | 'autre'

export interface Profile {
  id: string
  nom: string
  numero_whatsapp: string
  ville: string
  type_activite: TypeActivite
  credits_solde: number
  is_admin: boolean
  created_at: string
}

export type StatutModeration = 'en_attente' | 'approuve' | 'rejete'

/** Analyse produite par l'Agent Marketing (stockée en JSONB) */
export interface AnalyseMarketing {
  positionnement: string
  arguments_vente: string[]
  fourchette_prix_marche: string
  angles_publicitaires: string[]
  profil_acheteur: string
}

export interface Produit {
  id: string
  user_id: string
  nom: string
  description: string
  prix_fcfa: number
  photos: string[]
  statut_moderation: StatutModeration
  raison_rejet: string | null
  analyse_marketing: AnalyseMarketing | null
  created_at: string
}

export type AgentNom =
  | 'marketing'
  | 'copywriter'
  | 'visuel'
  | 'video'
  | 'voix'
  | 'reseaux_sociaux'
  | 'publicite'
  | 'analyse'
  | 'optimisation'

export type TypeGeneration = 'texte' | 'visuel' | 'video' | 'voix' | 'declinaison'

export interface Generation {
  id: string
  user_id: string
  produit_id: string
  agent: AgentNom
  type: TypeGeneration
  prompt_utilise: string | null
  resultat_url: string | null
  resultat_texte: string | null
  credits_consommes: number
  cout_api_estime_fcfa: number
  statut: 'en_attente' | 'en_cours' | 'termine' | 'echec'
  created_at: string
}

export type StatutCampagne =
  | 'brouillon'
  | 'payee'
  | 'en_cours'
  | 'terminee'
  | 'rejetee'

/** Statistiques quotidiennes saisies par l'admin puis analysées par l'Agent Analyse */
export interface StatJour {
  date: string
  portee: number
  clics: number
  conversations: number
  depense_fcfa: number
  resume_client?: string // résumé en langage humain généré par l'Agent Analyse
  signaux?: string[] // alertes détectées (coût qui monte, audience saturée…)
}

export interface Campagne {
  id: string
  user_id: string
  produit_id: string
  objectif: 'messages_whatsapp'
  ciblage_villes: string[]
  ciblage_genre: 'tous' | 'femmes' | 'hommes'
  ciblage_age_min: number
  ciblage_age_max: number
  ciblage_interets: string[]
  budget_client_fcfa: number
  budget_meta_fcfa: number
  duree_jours: number
  statut: StatutCampagne
  brief_genere: Record<string, unknown> | null
  stats_quotidiennes: StatJour[] | null
  recommandations_optimisation: Record<string, unknown> | null
  created_at: string
}

export interface Paiement {
  id: string
  user_id: string
  type: 'credits' | 'campagne'
  montant_fcfa: number
  reference_cinetpay: string
  statut: 'initie' | 'confirme' | 'echoue'
  campagne_id: string | null
  pack_credits: string | null
  created_at: string
}

export interface PackCredits {
  id: string
  nom: string
  prix_fcfa: number
  credits: number
  description: string
}
