// Partage WhatsApp : ouvre wa.me avec le texte pré-rempli.
export function partagerSurWhatsApp(texte: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, '_blank')
}

/** Copie un texte dans le presse-papiers */
export async function copierTexte(texte: string): Promise<void> {
  await navigator.clipboard.writeText(texte)
}
