// Appels ElevenLabs — voix off françaises naturelles.
// Partagé entre l'Agent Voix (utilisation seule) et l'Agent Vidéo (voix intégrée).

// Voix françaises ElevenLabs (multilingual v2) — remplaçables par variables d'env
const VOIX: Record<string, string> = {
  femme: Deno.env.get('ELEVENLABS_VOIX_FEMME') ?? 'EXAVITQu4vr4xnSDxMaL',
  homme: Deno.env.get('ELEVENLABS_VOIX_HOMME') ?? 'TX3LPaxmHKxFdv7VOQHJ',
}

// Réglages du ton demandé (stabilité / expressivité ElevenLabs)
const TONS: Record<string, { stability: number; style: number }> = {
  energique: { stability: 0.3, style: 0.7 },
  chaleureux: { stability: 0.5, style: 0.4 },
  professionnel: { stability: 0.75, style: 0.15 },
}

export type GenreVoix = 'femme' | 'homme'
export type TonVoix = 'energique' | 'chaleureux' | 'professionnel'

/** Génère un MP3 et retourne les octets audio */
export async function genererVoix(options: {
  texte: string
  genre: GenreVoix
  ton: TonVoix
}): Promise<Uint8Array> {
  const cle = Deno.env.get('ELEVENLABS_API_KEY')
  if (!cle) throw new Error('ELEVENLABS_API_KEY non configurée')
  const voixId = VOIX[options.genre] ?? VOIX.femme
  const reglages = TONS[options.ton] ?? TONS.chaleureux

  const reponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voixId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': cle, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: options.texte,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: reglages.stability,
          style: reglages.style,
          similarity_boost: 0.75,
        },
      }),
    }
  )
  if (!reponse.ok) {
    console.error('Erreur ElevenLabs:', reponse.status, await reponse.text())
    throw new Error('La génération de la voix a échoué')
  }
  return new Uint8Array(await reponse.arrayBuffer())
}
