import logoLight from "/logo.webp?url";
import logoDark from "/logo-on-dark.webp?url";

interface AppLogoProps {
  className?: string;
  alt?: string;
  /** true se il logo è su sfondo scuro (es. sidebar admin) → usa la variante per sfondi scuri */
  onDark?: boolean;
}

export function AppLogo({
  className = "h-10 w-auto",
  alt = "Stickers Matchbox",
  onDark = false,
}: AppLogoProps) {
  return (
    <img
      src={onDark ? logoDark : logoLight}
      alt={alt}
      className={className}
      decoding="async"
      draggable={false}
    />
  );
}
