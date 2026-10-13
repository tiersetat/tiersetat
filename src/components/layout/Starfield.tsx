/**
 * Fond du site : un bleu marine uni, avec une légère lumière en haut pour donner de la profondeur.
 * (Le nom est historique : ce fond était autrefois un ciel étoilé, puis la Terre la nuit.)
 */
export function Starfield({ dim = true }: { dim?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-nuit">
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-10%,rgb(61_90_254/0.22),transparent_60%)]" />
      {dim && <div className="absolute inset-0 bg-nuit/20" />}
    </div>
  );
}
