// Indicateur de chargement plein écran ou en ligne, avec message en français.
export function Chargement({ message = 'Chargement…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-encre-douce">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-or/30 border-t-or" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
