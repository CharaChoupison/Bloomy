// Ancre d'une séance, partagée par l'emploi du temps et la page Contenu des cours :
// basée sur l'heure de début (un élève n'a qu'un cours à la fois).
export const lessonAnchor = (startIso: string) => `seance-${Date.parse(startIso)}`;

/** Lien vers le contenu d'une séance : la page Contenu des cours s'ouvre sur la bonne semaine. */
export const lessonContentHref = (dateKey: string, startIso: string) =>
  `/cours?jour=${dateKey}#${lessonAnchor(startIso)}`;
