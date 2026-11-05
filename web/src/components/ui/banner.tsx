import { AlertCircleIcon } from "@/components/icons";

/**
 * Message en ligne à la place d'un contenu qui n'a pas pu être chargé.
 * `action` : par exemple un lien « Réessayer ».
 */
export function Banner({
  tone = "danger",
  children,
  action,
}: {
  tone?: "danger" | "warn";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const colors = tone === "danger" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn";
  return (
    <div className={`flex items-start gap-3 rounded-md px-4 py-3 text-callout ${colors}`}>
      <AlertCircleIcon />
      <p className="flex-1">{children}</p>
      {action}
    </div>
  );
}

/** Classes d'une action dans un Banner (lien souligné, hérite de la couleur du bandeau). */
export const bannerActionClasses =
  "font-semibold underline underline-offset-[3px] whitespace-nowrap rounded-sm";
