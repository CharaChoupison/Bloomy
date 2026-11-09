import "server-only";
import { headers } from "next/headers";

/** Adresse publique du site pour la requête en cours (derrière Caddy : en-têtes X-Forwarded-*). */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
