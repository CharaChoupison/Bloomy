import type { NextRequest } from "next/server";
import { checkAll } from "@/lib/push/check";
import { isValidTick, TICK_HEADER } from "@/lib/push/tick";

// POST /api/push/tick — vérification des notifications, appelée par le serveur lui-même
// (voir lib/push/tick.ts). Sans le jeton, dérivé du secret du serveur (256 bits), la route n'existe pas.
export async function POST(request: NextRequest) {
  if (!isValidTick(request.headers.get(TICK_HEADER))) {
    return new Response(null, { status: 404 });
  }
  const result = await checkAll();
  if (result.sent > 0) console.info(`[push] ${result.checked} session(s) vérifiée(s), ${result.sent} notification(s)`);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
