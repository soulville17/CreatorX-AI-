// Appels à l'API Anthropic (Claude) — textes, analyses, briefs, modération.
// Provider interchangeable : les modèles sont définis par variables d'environnement.

const API_URL = 'https://api.anthropic.com/v1/messages'

export function modeleSimple(): string {
  return Deno.env.get('CLAUDE_MODEL_SIMPLE') ?? 'claude-haiku-4-5-20251001'
}
export function modeleComplexe(): string {
  return Deno.env.get('CLAUDE_MODEL_COMPLEXE') ?? 'claude-sonnet-5'
}

interface BlocImage {
  type: 'image'
  source: { type: 'url'; url: string }
}
interface BlocTexte {
  type: 'text'
  text: string
}

/**
 * Appelle Claude et retourne le texte de la réponse.
 * `images` : URLs publiques (Storage) pour les tâches avec vision (modération).
 */
export async function appelerClaude(options: {
  modele: string
  systeme: string
  message: string
  images?: string[]
  maxTokens?: number
}): Promise<string> {
  const cle = Deno.env.get('ANTHROPIC_API_KEY')
  if (!cle) throw new Error('ANTHROPIC_API_KEY non configurée')

  const contenu: (BlocImage | BlocTexte)[] = [
    ...(options.images ?? []).map(
      (url): BlocImage => ({ type: 'image', source: { type: 'url', url } })
    ),
    { type: 'text', text: options.message },
  ]

  const reponse = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': cle,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: options.modele,
      max_tokens: options.maxTokens ?? 2048,
      system: options.systeme,
      messages: [{ role: 'user', content: contenu }],
    }),
  })

  if (!reponse.ok) {
    const detail = await reponse.text()
    console.error('Erreur API Anthropic:', reponse.status, detail)
    throw new Error("Le service d'IA est momentanément indisponible")
  }

  const data = await reponse.json()
  const bloc = data.content?.find((b: { type: string }) => b.type === 'text')
  return bloc?.text ?? ''
}

/**
 * Appelle Claude en attendant une réponse JSON.
 * Nettoie les éventuelles clôtures markdown avant de parser.
 */
export async function appelerClaudeJSON<T>(options: {
  modele: string
  systeme: string
  message: string
  images?: string[]
  maxTokens?: number
}): Promise<T> {
  const brut = await appelerClaude(options)
  const nettoye = brut
    .replace(/^```(json)?/m, '')
    .replace(/```\s*$/m, '')
    .trim()
  return JSON.parse(nettoye) as T
}
