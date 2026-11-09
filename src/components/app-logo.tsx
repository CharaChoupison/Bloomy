import { ANTENNA, LOWER_WING, mirror, UPPER_WING, VIEW_BOX } from "@/lib/app-logo.mjs";

/**
 * Icône de l'app (le papillon sur sa tuile), en vectoriel : même dessin que les icônes PWA,
 * mais aux couleurs de l'accent choisi par l'élève et du thème (clair / sombre).
 * Décorative : le nom « Bloomy » est toujours affiché à côté.
 */
export function AppLogo({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center bg-accent text-on-accent"
      // Même arrondi que l'icône PWA (22,5 % du côté), pour qu'on reconnaisse l'icône de l'écran d'accueil.
      style={{ width: size, height: size, borderRadius: size * 0.225 }}
    >
      <svg width={size * 0.8} height={size * 0.8} viewBox={VIEW_BOX} focusable="false">
        {[UPPER_WING, mirror(UPPER_WING)].map((d) => (
          <path key={d} d={d} fill="currentColor" />
        ))}
        {/* Ailes basses plus claires, comme sur l'icône PWA. */}
        {[LOWER_WING, mirror(LOWER_WING)].map((d) => (
          <path key={d} d={d} fill="currentColor" opacity={0.78} />
        ))}
        {[ANTENNA, mirror(ANTENNA)].map((d) => (
          <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
        ))}
      </svg>
    </span>
  );
}
