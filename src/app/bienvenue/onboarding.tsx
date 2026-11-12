"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enableNotifications, getPushPublicKey } from "@/app/(app)/reglages/notifications/actions";
import { AccentPicker, ThemePicker } from "@/components/appearance-pickers";
import { DayCard } from "@/components/day-card";
import {
  AlertCircleIcon,
  CalculatorIcon,
  CalendarIcon,
  ChartColumnIcon,
  CheckIcon,
  ChevronLeftIcon,
  PaletteIcon,
  ShareIcon,
  SmartphoneIcon,
  SquareCheckIcon,
  SquarePlusIcon,
  WifiOffIcon,
} from "@/components/icons";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { nextPathFromSearch } from "@/lib/auth/next-path";
import { markOnboarded } from "@/lib/preferences-client";
import { DEFAULT_PREFS } from "@/lib/push/changes";
import { detectPushSupport, isIOS, subscribeDevice, type PushSupport } from "@/lib/push/client";
import type { DayTimetable } from "@/lib/pronote/timetable";

/*
 * Onboarding après la première connexion. On n'y fait pas la visite de chaque section (la barre
 * d'onglets et la page Plus s'en chargent) : seulement ce qui demande un choix ou une permission,
 * puis un récapitulatif de ce qui ne se voit pas tout de suite.
 *   look    couleur + thème, avec aperçu
 *   install iPhone dans Safari : ajouter à l'écran d'accueil (indispensable aux notifications)
 *   notify  notifications, expliquées AVANT la demande du système (un refus est définitif)
 *   tour    ce qu'il y a à découvrir, et où
 * Les étapes dépendent de l'appareil : une étape impossible ici n'est pas montrée.
 */
type StepId = "look" | "install" | "notify" | "tour";

type Device = { support: PushSupport; ios: boolean };

// L'appareil ne change pas pendant la visite : lu une fois, même objet à chaque rendu.
let device: Device | undefined;
const readDevice = () => (device ??= { support: detectPushSupport(), ios: isIOS() });
const noSubscribe = () => () => {};

function stepsFor(d: Device | null): StepId[] {
  // Avant la détection (rendu serveur) : le cas le plus courant, pour que la barre ne saute pas.
  if (!d) return ["look", "notify", "tour"];
  if (d.support === "install") return ["look", "install", "tour"];
  if (d.support === "unsupported") return ["look", "tour"];
  return ["look", "notify", "tour"];
}

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

const COPY: Record<StepId, { title: string; text: string }> = {
  look: {
    title: "Choisis ton style",
    text: "La couleur colore les boutons, le jour actuel et ton prochain cours. Tu pourras tout changer dans les réglages.",
  },
  install: {
    title: "Installe Bloomy sur ton iPhone",
    text: "Bloomy s'ouvre alors en plein écran, comme une app. C'est aussi la seule façon de recevoir des notifications sur iPhone.",
  },
  notify: {
    title: "Ne rate plus rien",
    text: "Bloomy vérifie Pronote toutes les 15 minutes, de 7 h à 22 h, et te prévient sur cet appareil.",
  },
  tour: {
    title: "À découvrir ensuite",
    text: "Quelques fonctions qui ne se voient pas tout de suite, pour quand tu en auras besoin.",
  },
};

type Feature = { Icon: (p: { size?: number }) => React.ReactNode; title: string; text: string };

const NOTIFY_FEATURES: Feature[] = [
  { Icon: ChartColumnIcon, title: "Nouvelles notes", text: "Dès qu'une note est publiée. La note elle-même reste masquée." },
  { Icon: SquareCheckIcon, title: "Nouveaux devoirs", text: "Quand un prof ajoute un devoir." },
  { Icon: CalendarIcon, title: "Cours annulés ou modifiés", text: "Sur les deux semaines à venir." },
];

const INSTALL_STEPS: Feature[] = [
  { Icon: ShareIcon, title: "Touche Partager", text: "Dans la barre de Safari, en bas ou en haut de l'écran." },
  { Icon: SquarePlusIcon, title: "Choisis « Sur l'écran d'accueil »", text: "Fais défiler la liste si tu ne le vois pas." },
  { Icon: SmartphoneIcon, title: "Ouvre Bloomy depuis son icône", text: "Active ensuite les notifications dans Réglages." },
];

function tourFeatures(ios: boolean): Feature[] {
  return [
    { Icon: CalculatorIcon, title: "Simulateur de notes", text: "Dans Notes, ouvre une matière et essaie une note à venir." },
    { Icon: PaletteIcon, title: "Couleurs des matières", text: "À ton goût, dans Réglages › Personnalisation." },
    { Icon: WifiOffIcon, title: "Même sans réseau", text: "Les écrans déjà ouverts restent consultables hors ligne." },
    ...(ios
      ? [{ Icon: SmartphoneIcon, title: "Widget iPhone", text: "Ton prochain cours sur l'écran d'accueil, dans Réglages › Widget iPhone." }]
      : []),
  ];
}

/** Liste « picto + titre + phrase », la même que sur la page de connexion. */
function FeatureList({ items, ordered = false }: { items: Feature[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className="stagger flex flex-col gap-5">
      {items.map(({ Icon, title, text }, i) => (
        <li key={title} className="flex items-start gap-4">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
            <Icon />
            {ordered && (
              <span
                aria-hidden
                className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-accent text-[0.6875rem] font-semibold text-on-accent tabular-nums"
              >
                {i + 1}
              </span>
            )}
          </span>
          <div>
            <p className="text-headline">{title}</p>
            <p className="text-callout text-ink-muted">{text}</p>
          </div>
        </li>
      ))}
    </List>
  );
}

type NotifyState =
  | { status: "idle" | "busy" | "on" }
  | { status: "error"; text: string; denied: boolean };

export function Onboarding() {
  const router = useRouter();
  const env = useSyncExternalStore(noSubscribe, readDevice, () => null);
  const steps = stepsFor(env);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Notifications : la clé du serveur est demandée en arrivant sur l'étape, pour que la demande
  // de permission parte directement du toucher (iPhone l'exige).
  const [notify, setNotify] = useState<NotifyState>({ status: "idle" });
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canAskPush = env?.support === "ok";

  useEffect(() => {
    if (step !== "notify" || !canAskPush || publicKey) return;
    let cancelled = false;
    getPushPublicKey().then((key) => !cancelled && setPublicKey(key));
    return () => {
      cancelled = true;
    };
  }, [step, canAskPush, publicKey]);

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
    // Page demandée avant la connexion (lien du widget…), sinon l'Accueil.
    router.replace(nextPathFromSearch(window.location.search) ?? "/");
  };
  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  const enable = () => {
    setNotify({ status: "busy" });
    startTransition(async () => {
      const sub = await subscribeDevice(publicKey);
      if (!sub.ok) return setNotify({ status: "error", text: sub.error, denied: sub.denied });
      const result = await enableNotifications(sub.subscription, DEFAULT_PREFS);
      setNotify(result.ok ? { status: "on" } : { status: "error", text: result.error, denied: false });
    });
  };

  // Le bouton principal de l'étape notifications active ; une fois fait (ou impossible), il continue.
  const blocked = (notify.status === "error" && notify.denied) || (canAskPush && Notification.permission === "denied");
  const asksPermission = step === "notify" && canAskPush && notify.status !== "on" && !blocked;
  const primary = asksPermission
    ? { label: notify.status === "busy" ? "Activation…" : "Activer les notifications", onClick: enable }
    : { label: isLast ? "C'est parti" : "Continuer", onClick: next };

  return (
    <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:my-12 sm:flex-none sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8">
      <div className="flex items-center gap-3">
        {index > 0 ? (
          <Button variant="icon" aria-label="Étape précédente" onClick={back}>
            <ChevronLeftIcon />
          </Button>
        ) : (
          <span className="size-touch" aria-hidden />
        )}
        <div className="flex flex-1 gap-1.5" role="img" aria-label={`Étape ${index + 1} sur ${steps.length}`}>
          {steps.map((id, i) => (
            <i
              key={id}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= index ? "bg-accent" : "bg-surface-sunken"}`}
            />
          ))}
        </div>
        {/* Dernière étape : le bouton principal fait déjà la même chose. */}
        {isLast ? (
          <span className="w-[4.5rem]" aria-hidden />
        ) : (
          <Button variant="ghost" onClick={next} className="w-[4.5rem]">
            Passer
          </Button>
        )}
      </div>

      <div key={step} className="flex flex-1 animate-[step-in_320ms_var(--ease-enter)] flex-col gap-6 motion-reduce:animate-none">
        <div>
          <h1 ref={titleRef} tabIndex={-1} className="text-title outline-none">
            {COPY[step].title}
          </h1>
          <p className="mt-1.5 text-body text-ink-muted">{COPY[step].text}</p>
        </div>

        {step === "look" && (
          <>
            <div aria-label="Aperçu" role="group">
              <DayCard day={PREVIEW_DAY} isToday title="Aperçu" />
            </div>
            <AccentPicker />
            <ThemePicker />
          </>
        )}

        {step === "install" && <FeatureList items={INSTALL_STEPS} ordered />}

        {step === "notify" && (
          <>
            <FeatureList items={NOTIFY_FEATURES} />
            <NotifyStatus support={env?.support} state={notify} blocked={blocked} />
            <p className="text-caption text-ink-muted">
              Pour vérifier Pronote quand l&apos;app est fermée, le serveur de Bloomy garde un accès à ta session tant
              que les notifications sont activées.{" "}
              <a
                href="/confidentialite"
                target="_blank"
                rel="noopener"
                className="rounded-sm font-medium text-accent underline underline-offset-2"
              >
                En savoir plus
              </a>
            </p>
          </>
        )}

        {step === "tour" && <FeatureList items={tourFeatures(env?.ios ?? false)} />}
      </div>

      <Button
        variant="primary"
        block
        onClick={primary.onClick}
        busy={notify.status === "busy" && asksPermission}
        disabled={asksPermission && (notify.status === "busy" || !publicKey)}
        className="mt-auto"
      >
        {primary.label}
      </Button>
    </main>
  );
}

/** Retour de l'activation, annoncé aux lecteurs d'écran. */
function NotifyStatus({ support, state, blocked }: { support: PushSupport | undefined; state: NotifyState; blocked: boolean }) {
  if (support === "dev") {
    return <Banner tone="warn">Les notifications ne fonctionnent que sur la version en ligne de Bloomy.</Banner>;
  }
  if (state.status === "on") {
    return (
      <p role="status" className="flex items-center gap-2 text-callout font-medium text-success">
        <span className="pop grid size-6 place-items-center rounded-full bg-success-soft">
          <CheckIcon size={16} />
        </span>
        Notifications activées. Règle-les dans Réglages › Notifications.
      </p>
    );
  }
  if (blocked) {
    return (
      <Banner tone="warn">
        Les notifications sont bloquées sur cet appareil. Tu pourras les autoriser dans les réglages du système, puis
        dans Réglages › Notifications.
      </Banner>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="flex items-start gap-1.5 text-callout text-danger">
        <AlertCircleIcon size={18} className="mt-px shrink-0" />
        {state.text}
      </p>
    );
  }
  return null;
}
