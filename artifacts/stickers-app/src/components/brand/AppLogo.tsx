import logoUrl from "/logo.svg?url";

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export function AppLogo({ className = "h-10 w-auto", alt = "Stickers Matchbox" }: AppLogoProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={className}
      decoding="async"
      draggable={false}
    />
  );
}
