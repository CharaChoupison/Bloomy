"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccentPicker, ThemePicker } from "@/components/appearance-pickers";
import { DayCard } from "@/components/day-card";
import { ChevronLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { markOnboarded } from "@/lib/preferences-client";
import type { DayTimetable } from "@/lib/pronote/timetable";

const TOTAL_STEPS = 3; // 1 connexion (déjà faite), 2 couleur, 3 apparence

const STEPS = {
  2: {
    title: "Choisis ta couleur",
    text: "Elle colore les boutons, le jour actuel et ton prochain cours. Tu pourras la changer dans les réglages.",
  },
  3: {
    title: "Clair ou sombre ?",
    text: "Automatique suit le réglage de ton appareil, le soir comme en journée.",
  },
} as const;

// Exemple de journée pour l'aperçu : fixe (il montre l'effet du choix, pas de vraies données)
// et sans fuseau horaire, pour afficher 08:00 partout et pouvoir être prérendu.
const base = { groups: [] as string[], canceled: false, exempted: false, test: false };
const PREVIEW_DAY: DayTimetable = {
  date: "2026-01-08",
  classes: [
    { ...base, id: "a", kind: "lesson", start: "2026-01-08T08:00:00", end: "2026-01-08T09:00:00", title: "Mathématiques", teachers: ["M. Durand"], rooms: ["A112"], color: "#4a7fe0" },
    { ...base, id: "b", kind: "lesson", start: "2026-01-08T09:00:00", end: "2026-01-08T10:00:00", title: "Histoire-géographie", teachers: ["Mme Leroy"], rooms: ["B204"], color: "#e0962b", test: true },
  ],
};

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<2 | 3>(2);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // À chaque étape, le focus va sur le titre : le lecteur d'écran annonce la nouvelle question.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    titleRef.current?.focus();
  }, [step]);

  const finish = () => {
    markOnboarded();
    router.replace("/");
  };
  const next = () => (step === 2 ? setStep(3) : finish());

  return (
    <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:my-12 sm:flex-none sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8">
      <div className="flex items-center gap-3">
        {step === 3 ? (
          <Button variant="icon" aria-label="Étape précédente" onClick={() => setStep(2)}>
            <ChevronLeftIcon />
          </Button>
        ) : (
          <span className="size-touch" aria-hidden />
        )}
        <div className="flex flex-1 gap-1.5" role="img" aria-label={`Étape ${step} sur ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <i
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < step ? "bg-accent" : "bg-surface-sunken"}`}
            />
          ))}
        </div>
        <Button variant="ghost" onClick={next}>
          Passer
        </Button>
      </div>

      <div key={step} className="flex flex-1 animate-[step-in_320ms_var(--ease-enter)] flex-col gap-6 motion-reduce:animate-none">
        <div>
          <h1 ref={titleRef} tabIndex={-1} className="text-title outline-none">
            {STEPS[step].title}
          </h1>
          <p className="mt-1.5 text-body text-ink-muted">{STEPS[step].text}</p>
        </div>

        <div aria-label="Aperçu" role="group">
          <DayCard day={PREVIEW_DAY} isToday title="Aperçu" />
        </div>

        {step === 2 ? <AccentPicker /> : <ThemePicker />}
      </div>

      <Button variant="primary" block onClick={next} className="mt-auto">
        {step === 2 ? "Continuer" : "C'est parti"}
      </Button>
    </main>
  );
}
