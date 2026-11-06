"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatWeekRange } from "@/lib/format";
import { CalendarIcon } from "@/components/icons";

const MAX_OFFSET = 52;
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" → jours depuis l'époque (calcul en UTC : pas de piège d'heure d'été). */
const dayNumber = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

/**
 * Titre de la semaine affichée (« 2 – 8 novembre ») qui ouvre le sélecteur de date natif :
 * roue / calendrier d'iOS sur téléphone, calendrier du navigateur sur ordinateur.
 * Choisir n'importe quel jour ouvre la semaine qui le contient.
 *
 * Le champ date transparent couvre le bouton : un appui l'ouvre directement sur iOS,
 * et showPicker() l'ouvre au clic sur ordinateur (où seule l'icône du champ le ferait).
 */
export function WeekPicker({
  weekStart,
  offset,
  hrefFor,
}: {
  /** Lundi de la semaine affichée ("YYYY-MM-DD"). */
  weekStart: string;
  /** Décalage de cette semaine par rapport à la semaine en cours. */
  offset: number;
  /** Préfixe de l'URL de la page (le décalage est ajouté en ?semaine=). */
  hrefFor: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const go = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const picked = dayNumber(value);
    // Lundi de la semaine choisie (le 1er janvier 1970 était un jeudi : +3 pour caler sur lundi).
    const monday = picked - ((picked + 3) % 7);
    const target = offset + Math.round((monday - dayNumber(weekStart)) / 7);
    const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, target));
    if (clamped === offset) return;
    startTransition(() => router.push(clamped === 0 ? hrefFor : `${hrefFor}?semaine=${clamped}`));
  };

  return (
    <div className="group relative inline-flex rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
      <span
        aria-hidden
        className={`inline-flex min-h-touch items-center gap-2 rounded-full px-4 text-body font-semibold transition-colors ${
          pending ? "opacity-60" : ""
        } group-hover:bg-surface`}
      >
        <CalendarIcon size={18} className="text-accent" />
        <span className="tabular-nums">{formatWeekRange(weekStart)}</span>
      </span>
      <input
        ref={input}
        type="date"
        aria-label={`Choisir une semaine, semaine affichée : ${formatWeekRange(weekStart)}`}
        aria-busy={pending || undefined}
        value={weekStart}
        onChange={(e) => go(e.target.value)}
        onClick={() => {
          try {
            input.current?.showPicker();
          } catch {
            // Navigateur sans showPicker() : le champ reste utilisable tel quel.
          }
        }}
        className="absolute inset-0 cursor-pointer rounded-full opacity-0 focus-visible:outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
    </div>
  );
}
