import type { PlainAttachment } from "@/lib/pronote/attachments";
import { ExternalLinkIcon, PaperclipIcon } from "@/components/icons";

/** Lien vers une pièce jointe Pronote : trombone (fichier) ou lien externe, nom tronqué, nouvel onglet. */
export function AttachmentLink({ file }: { file: PlainAttachment }) {
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-touch max-w-full min-w-0 items-center gap-1 rounded-sm text-caption font-medium text-accent underline-offset-2 hover:underline"
    >
      {file.isLink ? <ExternalLinkIcon size={16} /> : <PaperclipIcon size={16} />}
      <span className="truncate">{file.name}</span>
      <span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
    </a>
  );
}

/** Liste de pièces jointes, une par ligne. */
export function AttachmentList({ files, className = "" }: { files: PlainAttachment[]; className?: string }) {
  if (files.length === 0) return null;
  return (
    <ul className={`flex min-w-0 flex-col ${className}`}>
      {files.map((f) => (
        <li key={f.url} className="flex min-w-0">
          <AttachmentLink file={f} />
        </li>
      ))}
    </ul>
  );
}
