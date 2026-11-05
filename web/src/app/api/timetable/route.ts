import type { NextRequest } from "next/server";
import { hasValidSession } from "@/lib/auth/session";
import { getWeekTimetable, mondayKey } from "@/lib/pronote/timetable";

// GET /api/timetable?semaine=0  → emploi du temps de la semaine en JSON.
// La page d'accueil n'en a pas besoin (le Server Component appelle directement la lib),
// mais cette route servira pour les appels côté client (rafraîchissement, futures vues…).
export async function GET(request: NextRequest) {
  if (!(await hasValidSession())) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  const semaine = request.nextUrl.searchParams.get("semaine");
  const offset = Math.max(-52, Math.min(52, Number.parseInt(semaine ?? "0", 10) || 0));

  try {
    return Response.json(await getWeekTimetable(mondayKey(offset)));
  } catch (error) {
    console.error("[pronote]", error);
    return Response.json({ error: "Pronote indisponible" }, { status: 502 });
  }
}
