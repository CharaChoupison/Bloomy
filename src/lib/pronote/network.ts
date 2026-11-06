import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { cleanURL } from "pawnote";

// Avec plusieurs élèves, l'adresse Pronote vient de ce qu'ils tapent : le serveur appelle donc
// une URL choisie par l'utilisateur. Sans garde, on pourrait lui faire interroger le serveur
// lui-même ou le réseau interne d'Oracle (SSRF). Deux protections :
// 1. Liste des établissements autorisés (PRONOTI_ALLOWED_HOSTS), vérifiée à la connexion.
// 2. Toute requête sortante (et chaque redirection) doit viser une adresse IP publique.

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 127], ["100::", 64], ["2001:db8::", 32], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) blocked.addSubnet(net, prefix, "ipv6");

export class BlockedDestinationError extends Error {
  constructor(host: string) {
    super(`Destination refusée : ${host}`);
    this.name = "BlockedDestinationError";
  }
}

/** Les 8 groupes de 16 bits d'une adresse IPv6 (gère « :: » et une IPv4 en fin d'adresse). */
function ipv6Groups(address: string): number[] {
  let text = address.toLowerCase();
  const v4 = text.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    text = text.slice(0, v4.index) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail = ""] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = text.includes("::") && tail ? tail.split(":") : [];
  const fill = text.includes("::") ? Array(8 - left.length - right.length).fill("0") : [];
  return [...left, ...fill, ...right].map((g) => parseInt(g, 16));
}

/**
 * IPv4 contenue dans une IPv6 qui la transporte, sinon `null` :
 * ::ffff:a.b.c.d (IPv4 « mappée ») et 64:ff9b::/96 (NAT64, utilisé par certains réseaux IPv6).
 */
function embeddedIpv4(address: string): string | null {
  const g = ipv6Groups(address);
  const mapped = g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff;
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0);
  if (!mapped && !nat64) return null;
  return [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join(".");
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family !== 6) return false;
  const v4 = embeddedIpv4(address); // une IPv4 déguisée suit les règles IPv4
  return v4 ? !blocked.check(v4, "ipv4") : !blocked.check(address, "ipv6");
}

/** Lève BlockedDestinationError si l'URL ne vise pas un serveur public en http(s). */
export async function assertPublicUrl(url: URL): Promise<void> {
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new BlockedDestinationError(url.host);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) throw new BlockedDestinationError(url.host);
}

/** Adresse Pronote par défaut, proposée sur l'écran de connexion. */
export function defaultInstanceUrl(): string | undefined {
  const raw = process.env.PRONOTE_DEFAULT_URL || process.env.PRONOTE_URL; // PRONOTE_URL : ancien nom
  return raw ? parseInstanceUrl(raw) ?? undefined : undefined;
}

/**
 * Établissements autorisés : PRONOTI_ALLOWED_HOSTS (noms séparés par des virgules, ou « * » pour tous).
 * Sans réglage, seul l'établissement de l'adresse par défaut est accepté. `null` = tous.
 */
export function allowedHosts(): string[] | null {
  const raw = process.env.PRONOTI_ALLOWED_HOSTS?.trim();
  if (raw === "*") return null;
  if (raw) return raw.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  const fallback = defaultInstanceUrl();
  return fallback ? [new URL(fallback).hostname] : null;
}

/** Vrai si l'élève n'a pas à choisir son établissement (un seul autorisé, connu). */
export function isSingleInstance(): boolean {
  const hosts = allowedHosts();
  const fallback = defaultInstanceUrl();
  return !!fallback && hosts?.length === 1 && hosts[0] === new URL(fallback).hostname;
}

/**
 * "nice.ilec.fr", "https://x.index-education.net/pronote/eleve.html?…" → adresse de base de l'instance.
 * `null` si ce n'est pas une adresse web exploitable.
 */
export function parseInstanceUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > 300) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return cleanURL(url.href);
  } catch {
    return null;
  }
}

export function isAllowedInstance(instanceUrl: string): boolean {
  const hosts = allowedHosts();
  return hosts === null || hosts.includes(new URL(instanceUrl).hostname.toLowerCase());
}
