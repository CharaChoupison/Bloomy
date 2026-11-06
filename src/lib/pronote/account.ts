import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { account } from "pawnote";
import { verifySession } from "@/lib/auth/session";
import { withPronote } from "./client";
import { viewerTag } from "./cache-tags";

export type AccountView = {
  name: string;
  className?: string;
  school: string;
  photoUrl?: string;
  isDelegate: boolean;
  email: string;
  /** Formaté pour la lecture ("+33 6 12 34 56 78"). */
  phone: string;
  /** Lignes de l'adresse postale, prêtes à afficher. */
  address: string[];
  ine: string;
  // Volontairement absent : iCalToken (clé d'accès au calendrier, équivalente à un mot de passe).
};

/** "+33612345678" → "+33 6 12 34 56 78" ; les autres formats sont laissés tels quels. */
function formatPhone(raw: string): string {
  const compact = raw.replace(/\s+/g, "");
  const fr = compact.match(/^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return fr ? `+33 ${fr.slice(1).join(" ")}` : raw.trim();
}

/**
 * Infos du compte de l'élève.
 * Réservé à l'élève connecté : la session est vérifiée ici, et le cache est propre à chaque élève.
 */
export async function getAccount(): Promise<AccountView> {
  const viewer = await verifySession();
  return getAccountFor(viewer.id);
}

async function getAccountFor(viewerId: string): Promise<AccountView> {
  "use cache";
  cacheLife("minutes");
  cacheTag(viewerTag(viewerId));

  return withPronote(viewerId, async (session) => {
    const info = await account(session);
    const user = session.userResource;
    const photo = user.profilePicture?.url;
    const cityLine = [info.postalCode, info.city].map((s) => s.trim()).filter(Boolean).join(" ");

    return {
      name: user.name,
      className: user.className || undefined,
      school: user.establishmentName,
      photoUrl: photo && /^https?:\/\//i.test(photo) ? photo : undefined,
      isDelegate: user.isDelegate,
      email: info.email.trim(),
      phone: formatPhone(info.phone),
      address: [...info.address, cityLine, info.province, info.country].map((s) => s.trim()).filter(Boolean),
      ine: info.INE.trim(),
    };
  });
}
