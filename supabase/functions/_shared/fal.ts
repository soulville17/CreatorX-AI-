// Appels à fal.ai — images (FLUX) et vidéos (Kling / Wan).
// Provider interchangeable via variables d'environnement (VIDEO_MODEL, IMAGE_MODEL_*).

const FAL_BASE = 'https://fal.run' // exécution synchrone
const FAL_QUEUE = 'https://queue.fal.run' // file d'attente (vidéos)

function cleFal(): string {
  const cle = Deno.env.get('FAL_API_KEY')
  if (!cle) throw new Error('FAL_API_KEY non configurée')
  return cle
}

export function modeleImageBrouillon(): string {
  return Deno.env.get('IMAGE_MODEL_DRAFT') ?? 'fal-ai/flux/schnell'
}
export function modeleImageFinal(): string {
  return Deno.env.get('IMAGE_MODEL_FINAL') ?? 'fal-ai/flux-pro'
}

/** Identifiant du modèle vidéo fal.ai selon VIDEO_MODEL (kling par défaut, wan en éco) */
export function modeleVideo(): { id: string; nom: 'kling' | 'wan' } {
  const choix = (Deno.env.get('VIDEO_MODEL') ?? 'kling').toLowerCase()
  if (choix === 'wan') {
    return { id: 'fal-ai/wan/v2.2-5b/image-to-video', nom: 'wan' }
  }
  return { id: 'fal-ai/kling-video/v2/master/image-to-video', nom: 'kling' }
}

/** Génère une image (synchrone) et retourne son URL temporaire fal.ai */
export async function genererImage(options: {
  modele: string
  prompt: string
  format?: 'portrait_16_9' | 'square' // 9:16 vertical ou carré
}): Promise<string> {
  const reponse = await fetch(`${FAL_BASE}/${options.modele}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${cleFal()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: options.prompt,
      image_size: options.format === 'square' ? 'square_hd' : 'portrait_16_9',
      num_images: 1,
    }),
  })
  if (!reponse.ok) {
    console.error('Erreur fal.ai image:', reponse.status, await reponse.text())
    throw new Error("La génération d'image a échoué")
  }
  const data = await reponse.json()
  const url = data.images?.[0]?.url
  if (!url) throw new Error("La génération d'image a échoué")
  return url
}

/** Soumet une vidéo à la file d'attente fal.ai. Retourne l'identifiant de requête. */
export async function soumettreVideo(options: {
  imageUrl: string
  prompt: string
  dureeSecondes?: number
}): Promise<{ requestId: string; modele: string }> {
  const { id } = modeleVideo()
  const reponse = await fetch(`${FAL_QUEUE}/${id}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${cleFal()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: options.imageUrl,
      prompt: options.prompt,
      duration: String(options.dureeSecondes ?? 10),
      aspect_ratio: '9:16', // format vertical TikTok / Reels / Statut WhatsApp
    }),
  })
  if (!reponse.ok) {
    console.error('Erreur fal.ai vidéo:', reponse.status, await reponse.text())
    throw new Error('Le lancement de la vidéo a échoué')
  }
  const data = await reponse.json()
  return { requestId: data.request_id, modele: id }
}

/** Interroge la file d'attente : statut + URL de la vidéo si terminée */
export async function statutVideo(
  modele: string,
  requestId: string
): Promise<{ statut: 'en_attente' | 'en_cours' | 'termine' | 'echec'; url?: string }> {
  const base = `${FAL_QUEUE}/${modele}/requests/${requestId}`
  const statutRep = await fetch(`${base}/status`, {
    headers: { Authorization: `Key ${cleFal()}` },
  })
  if (!statutRep.ok) return { statut: 'echec' }
  const s = await statutRep.json()

  if (s.status === 'IN_QUEUE') return { statut: 'en_attente' }
  if (s.status === 'IN_PROGRESS') return { statut: 'en_cours' }
  if (s.status !== 'COMPLETED') return { statut: 'echec' }

  const resultatRep = await fetch(base, {
    headers: { Authorization: `Key ${cleFal()}` },
  })
  if (!resultatRep.ok) return { statut: 'echec' }
  const r = await resultatRep.json()
  const url = r.video?.url ?? r.videos?.[0]?.url
  return url ? { statut: 'termine', url } : { statut: 'echec' }
}
