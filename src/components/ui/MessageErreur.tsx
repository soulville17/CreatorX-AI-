// Affichage d'erreur en français simple, jamais de jargon technique.
export function MessageErreur({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-xl bg-erreur/10 border border-erreur/20 px-4 py-3 text-sm text-erreur">
      {message}
    </div>
  )
}
