import type { NewsEntry } from "@/lib/pronote/news";
import { Badge } from "@/components/ui/badge";

/** L'actualité attend une action de l'élève (dans Pronote : Bloomy est en lecture seule). */
export const needsAction = (n: NewsEntry) => n.needsAcknowledgement || n.needsAnswer;

/** Pastilles d'état d'une actualité : sondage, action attendue. Partagées par la liste et le détail. */
export function NewsBadges({ n }: { n: NewsEntry }) {
  if (n.kind !== "survey" && !needsAction(n)) return null;
  return (
    <>
      {n.kind === "survey" && <Badge tone="neutral">Sondage</Badge>}
      {n.needsAcknowledgement && <Badge tone="warn">À confirmer</Badge>}
      {n.needsAnswer && <Badge tone="warn">À répondre</Badge>}
    </>
  );
}
