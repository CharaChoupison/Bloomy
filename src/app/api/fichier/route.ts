import type { NextRequest } from "next/server";
import { hasValidSession } from "@/lib/auth/session";
import { attachmentDisposition, fileNameFromUrl, pronoteFileUrl } from "@/lib/pronote/files";
import { assertPublicUrl } from "@/lib/pronote/network";

// GET /api/fichier?u=<URL Pronote>  → télécharge la pièce jointe (Content-Disposition: attachment).
// Réservé à l'élève connecté, et limité aux fichiers de son instance Pronote (voir lib/pronote/files.ts).
export async function GET(request: NextRequest) {
  if (!(await hasValidSession())) {
    return text("Connecte-toi à Pronoti pour télécharger ce fichier.", 401);
  }

  let url: URL | null;
  try {
    url = await pronoteFileUrl(request.nextUrl.searchParams.get("u"));
  } catch (error) {
    console.error("[pronote] fichier", error);
    return text("Pronote ne répond pas. Réessaie dans un instant.", 502);
  }
  if (!url) return text("Ce lien ne correspond pas à un fichier Pronote.", 400);

  let upstream: Response;
  try {
    await assertPublicUrl(url);
    upstream = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    console.error("[pronote] fichier", error);
    return text("Pronote ne répond pas. Réessaie dans un instant.", 502);
  }

  const name = fileNameFromUrl(url);
  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  // Lien périmé (la session Pronote qui l'a produit a expiré) : Pronote répond une page HTML.
  const expired = /text\/html/i.test(type) && !/\.html?$/i.test(name);
  if (!upstream.ok || !upstream.body || expired) {
    await upstream.body?.cancel();
    return text("Ce fichier n'est plus disponible. Recharge la page puis réessaie.", 502);
  }

  const headers = new Headers({
    "Content-Type": type,
    "Content-Disposition": attachmentDisposition(name),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
    "Cache-Control": "private, no-store",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { headers });
}

function text(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
