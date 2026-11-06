// Pièces jointes Pronote → objets plats, en ne gardant que les liens http(s)
// (jamais de javascript: ou autre schéma). Partagé par devoirs, cours, actualités, messagerie.

export type PlainAttachment = { name: string; url: string; isLink: boolean };

export function plainAttachments(files: ReadonlyArray<{ name: string; url: string; kind: number }>): PlainAttachment[] {
  return files.flatMap((f) =>
    /^https?:\/\//i.test(f.url) ? [{ name: f.name || "Pièce jointe", url: f.url, isLink: f.kind === 0 }] : [],
  );
}
