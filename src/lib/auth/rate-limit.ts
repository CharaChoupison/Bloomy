import "server-only";
import { headers } from "next/headers";

// Limiteur en mémoire, par fenêtre glissante. Suffisant pour un seul serveur Node ;
// les compteurs repartent à zéro au redémarrage, ce qui est acceptable ici.
const MAX_KEYS = 10_000; // borne la mémoire si quelqu'un fait varier ses clés

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  private recent(key: string, now: number): number[] {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  /** Vrai si la clé a atteint la limite sur la fenêtre en cours. */
  isLimited(key: string): boolean {
    return this.recent(key, Date.now()).length >= this.max;
  }

  record(key: string): void {
    const now = Date.now();
    if (this.hits.size >= MAX_KEYS) {
      for (const k of this.hits.keys()) this.recent(k, now); // purge les clés périmées
      if (this.hits.size >= MAX_KEYS) this.hits.delete(this.hits.keys().next().value!);
    }
    this.hits.set(key, [...this.recent(key, now), now]);
  }

  clear(key: string): void {
    this.hits.delete(key);
  }
}

/**
 * Adresse IP du visiteur. En production, Caddy ajoute la vraie IP à la FIN de X-Forwarded-For
 * (ce que le client a pu y mettre avant est ignoré). En local, pas d'en-tête : « local ».
 */
export async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",").pop()?.trim() || "local";
}
