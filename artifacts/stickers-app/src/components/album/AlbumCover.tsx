import { ImageIcon } from "lucide-react";

/**
 * Anteprima copertina album — discreta, elegante, coerente ovunque.
 * - Box quadrato a dimensione fissa (nessun layout shift) con `object-cover`.
 * - Caricamento `lazy` + decoding `async`: fluida anche su dispositivi economici.
 * - Le immagini arrivano dalla CDN di Supabase Storage (cache immutabile): non
 *   passano dal backend Render e restano leggere (WebP ottimizzato ~50-120 KB).
 * - Senza copertina mostra un placeholder neutro.
 *
 * La dimensione si controlla via `className` (es. "h-12 w-12", "h-24 w-24").
 */
interface AlbumCoverProps {
  url?: string | null;
  title: string;
  className?: string;
}

export function AlbumCover({ url, title, className = "h-12 w-12" }: AlbumCoverProps) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted flex items-center justify-center ${className}`}
    >
      {url ? (
        <img
          src={url}
          alt={`Copertina ${title}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon className="h-2/5 w-2/5 text-muted-foreground/40" />
      )}
    </div>
  );
}

export default AlbumCover;
