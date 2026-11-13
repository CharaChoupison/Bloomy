"use client";

import { useRef, useState, useTransition } from "react";
import { removeAssignmentFile, uploadAssignmentFile } from "@/app/(app)/devoirs/actions";
import type { AssignmentItem } from "@/lib/pronote/assignments";
import { formatFileSize } from "@/lib/format";
import { AttachmentLink } from "@/components/attachment-link";
import { AlertCircleIcon, Trash2Icon, UploadIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Plafond de l'app (next.config.ts : 25 Mo, moins la marge du formulaire). */
const APP_MAX_BYTES = 24 * 1024 * 1024;

/**
 * Rendu d'un devoir « à déposer en ligne » : déposer sa copie, la consulter, la retirer.
 * La taille est vérifiée avant l'envoi (limite de Pronote) pour ne pas faire attendre l'élève pour rien.
 * Après l'envoi, la liste se recharge depuis Pronote : l'état affiché est celui que Pronote a enregistré.
 */
export function AssignmentSubmission({ a }: { a: AssignmentItem }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"upload" | "remove">();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState("");
  const baseId = `copie-${a.id}`;

  const maxBytes = a.uploadMaxBytes > 0 ? Math.min(a.uploadMaxBytes, APP_MAX_BYTES) : APP_MAX_BYTES;

  const upload = (file: File) => {
    setError(undefined);
    if (file.size === 0) return setError("Ce fichier est vide. Choisis-en un autre.");
    if (file.size > maxBytes) {
      return setError(`Fichier trop lourd (${formatFileSize(file.size)}) : ${formatFileSize(maxBytes)} maximum.`);
    }
    const form = new FormData();
    form.set("id", a.id);
    form.set("file", file);
    setAction("upload");
    setStatus("Envoi de la copie…");
    startTransition(async () => {
      const result = await uploadAssignmentFile(form).catch(() => ({
        ok: false as const,
        error: "Envoi interrompu. Vérifie ta connexion et réessaie.",
      }));
      setStatus(result.ok ? "Copie déposée." : "");
      if (!result.ok) setError(result.error);
    });
  };

  const remove = () => {
    if (!window.confirm("Retirer ta copie de Pronote ? Tu pourras en déposer une autre.")) return;
    setError(undefined);
    setAction("remove");
    setStatus("Retrait de la copie…");
    startTransition(async () => {
      const result = await removeAssignmentFile(a.id).catch(() => ({
        ok: false as const,
        error: "Retrait interrompu. Vérifie ta connexion et réessaie.",
      }));
      setStatus(result.ok ? "Copie retirée." : "");
      if (!result.ok) setError(result.error);
    });
  };

  const uploaded = a.uploadedFile;

  return (
    <div className="mt-2 flex flex-col gap-1">
      {uploaded ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone="success">Copie déposée</Badge>
          <span className="flex min-w-0">
            <AttachmentLink file={uploaded} />
          </span>
          {a.canUpload && (
            <Button
              variant="ghost"
              onClick={remove}
              disabled={pending}
              busy={pending && action === "remove"}
              aria-describedby={error ? `${baseId}-error` : undefined}
            >
              {!(pending && action === "remove") && <Trash2Icon size={16} />}
              {pending && action === "remove" ? "Retrait…" : "Retirer"}
            </Button>
          )}
        </div>
      ) : (
        a.canUpload && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <input
              ref={inputRef}
              id={`${baseId}-input`}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = ""; // permet de re-choisir le même fichier après une erreur
                if (file) upload(file);
              }}
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              busy={pending && action === "upload"}
              aria-describedby={`${baseId}-hint${error ? ` ${baseId}-error` : ""}`}
            >
              {!(pending && action === "upload") && <UploadIcon size={18} />}
              {pending && action === "upload" ? "Envoi…" : "Déposer ma copie"}
            </Button>
            <span id={`${baseId}-hint`} className="text-caption text-ink-muted">
              {formatFileSize(maxBytes)} maximum
            </span>
          </div>
        )
      )}

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      {error && (
        <p id={`${baseId}-error`} role="alert" className="flex items-start gap-1 text-caption text-danger">
          <AlertCircleIcon size={16} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
