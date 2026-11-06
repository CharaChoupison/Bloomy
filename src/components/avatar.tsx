"use client";

import { useState } from "react";

/** Initiales à partir du nom Pronote ("MARTIN Léa" → "ML"). */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Photo de profil Pronote, ou initiales si Pronote n'en fournit pas ou si l'image ne charge pas
 * (les liens Pronote expirent avec la session). Décorative : le nom est écrit à côté.
 */
export function Avatar({ name, src, size = 64 }: { name: string; src?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image distante de Pronote, URL temporaire : pas d'optimisation next/image
      <img
        src={src}
        alt=""
        style={style}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full border border-line bg-surface-sunken object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className="grid shrink-0 place-items-center rounded-full bg-accent-soft text-title font-semibold text-accent"
    >
      {initials(name)}
    </span>
  );
}
