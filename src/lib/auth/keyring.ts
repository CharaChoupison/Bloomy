import "server-only";

// Clés de déchiffrement des sessions actives, en mémoire seulement.
// Les fonctions "use cache" ne peuvent pas lire les cookies, et la clé ne doit jamais entrer
// dans une clé de cache (stockée en clair par Next.js). getViewer() dépose donc la clé ici
// à chaque requête, et le client Pronote la reprend avec le viewerId, qui n'a rien de secret.
const IDLE_MS = 30 * 60 * 1000;

type Entry = { key: Buffer; lastUsed: number };
const store = globalThis as typeof globalThis & { __pronotiKeyring?: Map<string, Entry> };
const keys = (store.__pronotiKeyring ??= new Map());

function sweep(now: number) {
  for (const [id, entry] of keys) if (now - entry.lastUsed > IDLE_MS) keys.delete(id);
}

export function rememberKey(viewerId: string, key: Buffer): void {
  const now = Date.now();
  sweep(now);
  keys.set(viewerId, { key, lastUsed: now });
}

export function recallKey(viewerId: string): Buffer | undefined {
  const entry = keys.get(viewerId);
  if (entry) entry.lastUsed = Date.now();
  return entry?.key;
}

export function forgetKey(viewerId: string): void {
  keys.delete(viewerId);
}
