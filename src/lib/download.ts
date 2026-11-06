// Lien de téléchargement d'une pièce jointe Pronote, servi par /api/fichier (voir lib/pronote/files.ts).
export const downloadHref = (pronoteUrl: string) => `/api/fichier?u=${encodeURIComponent(pronoteUrl)}`;
