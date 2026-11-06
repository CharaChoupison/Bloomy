// Fuseau horaire de l'établissement, partagé serveur / client.
//
// Pawnote construit les horaires Pronote avec l'heure locale du processus (new Date(a, m, j, h, min)) :
// sur un serveur en UTC, un cours de 14:15 devenait 14:15 UTC, soit 15:15 à Paris. Le serveur est donc
// calé sur ce fuseau (voir instrumentation.ts), et l'affichage des heures aussi, sur le serveur comme
// dans le navigateur : l'élève voit l'heure de son établissement, même si son appareil est ailleurs.
//
// Établissement hors métropole (La Réunion, Antilles…) : NEXT_PUBLIC_PRONOTI_TIMEZONE=Indian/Reunion, etc.
export const SCHOOL_TIME_ZONE = process.env.NEXT_PUBLIC_PRONOTI_TIMEZONE || "Europe/Paris";
