// metaAdsService — interface d'abstraction vers Meta Ads.
//
// Phase 1 : implémentation "manuel" — l'Agent Publicité génère un brief complet
// et l'administrateur lance la campagne à la main dans Meta Ads Manager.
// Phase 2 : brancher `MetaAdsApi` sur la Meta Marketing API (mêmes signatures),
// puis changer META_ADS_IMPLEMENTATION=api.

export interface BriefCampagne {
  produit: string
  format: string // "Click-to-WhatsApp"
  ciblage: {
    villes: string[]
    genre: string
    age_min: number
    age_max: number
    interets_meta: string[] // centres d'intérêt Meta réels, en anglais
  }
  texte_principal: string
  accroches: string[]
  budget_quotidien_meta_fcfa: number
  duree_jours: number
  checklist_lancement: string[]
}

export interface ResultatLancement {
  mode: 'manuel' | 'api'
  meta_campaign_id: string | null
  message: string
}

export interface MetaAdsService {
  /** Lance (ou prépare) la campagne à partir du brief généré */
  lancerCampagne(campagneId: string, brief: BriefCampagne): Promise<ResultatLancement>
}

/** Phase 1 : rien n'est envoyé à Meta — l'admin suit la checklist du brief. */
class MetaAdsManuel implements MetaAdsService {
  lancerCampagne(campagneId: string): Promise<ResultatLancement> {
    return Promise.resolve({
      mode: 'manuel',
      meta_campaign_id: null,
      message: `Campagne ${campagneId} à lancer manuellement dans Meta Ads Manager (voir le brief et sa checklist).`,
    })
  }
}

/** Phase 2 : à implémenter avec la Meta Marketing API (META_ACCESS_TOKEN…). */
class MetaAdsApi implements MetaAdsService {
  lancerCampagne(): Promise<ResultatLancement> {
    throw new Error(
      "L'automatisation Meta Marketing API n'est pas encore activée (phase 2)."
    )
  }
}

export function metaAdsService(): MetaAdsService {
  const impl = Deno.env.get('META_ADS_IMPLEMENTATION') ?? 'manuel'
  return impl === 'api' ? new MetaAdsApi() : new MetaAdsManuel()
}
