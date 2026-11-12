"use client";

import { useEffect, useState, useTransition } from "react";
import { DEFAULT_PREFS, type PushPrefs } from "@/lib/push/changes";
import { detectPushSupport, subscribeDevice, type PushSupport } from "@/lib/push/client";
import { AlertCircleIcon, CheckIcon } from "@/components/icons";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  disableNotifications,
  enableNotifications,
  sendTestNotification,
  updateNotificationPrefs,
  type PushActionResult,
} from "./actions";

type Support = "checking" | PushSupport;

const PREF_ROWS: { key: keyof PushPrefs; label: string; hint: string }[] = [
  { key: "grades", label: "Nouvelles notes", hint: "Dès qu'une note est publiée" },
  { key: "assignments", label: "Nouveaux devoirs", hint: "Quand un prof ajoute un devoir" },
  { key: "timetable", label: "Changements d'emploi du temps", hint: "Cours annulé ou modifié, sur deux semaines" },
  {
    key: "showValues",
    label: "Afficher la note",
    hint: "Visible sur l'écran verrouillé : désactivé par défaut",
  },
];

/**
 * Réglages des notifications de CET appareil : activation (permission du navigateur + abonnement),
 * types de notifications, essai et désactivation. Chaque appareil s'abonne séparément.
 */
export function NotificationSettings({
  publicKey,
  enabledHere,
}: {
  publicKey: string | null;
  enabledHere: { endpoint: string; prefs: PushPrefs } | null;
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [enabled, setEnabled] = useState(false);
  const [denied, setDenied] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs>(enabledHere?.prefs ?? DEFAULT_PREFS);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string }>();

  // L'état réel se lit dans le navigateur : permission retirée, abonnement d'un autre appareil…
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = detectPushSupport();
      let on = false;
      if (s === "ok") {
        const registration = await navigator.serviceWorker.getRegistration();
        const sub = await registration?.pushManager.getSubscription();
        on = !!enabledHere && sub?.endpoint === enabledHere.endpoint && Notification.permission === "granted";
      }
      if (cancelled) return;
      setSupport(s);
      setEnabled(on);
      setDenied(s === "ok" && Notification.permission === "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, [enabledHere]);

  const report = (result: PushActionResult, success?: string) => {
    if (!result.ok) setMessage({ tone: "error", text: result.error });
    else if (success) setMessage({ tone: "success", text: success });
    else setMessage(undefined);
    return result.ok;
  };

  const enable = () => {
    setMessage(undefined);
    startTransition(async () => {
      const device = await subscribeDevice(publicKey);
      if (!device.ok) {
        setDenied(device.denied);
        setMessage({ tone: "error", text: device.error });
        return;
      }
      if (report(await enableNotifications(device.subscription, prefs), "Notifications activées sur cet appareil.")) setEnabled(true);
    });
  };

  const disable = () => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await disableNotifications();
      const registration = await navigator.serviceWorker.getRegistration();
      await (await registration?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
      if (report(result, "Notifications désactivées.")) setEnabled(false);
    });
  };

  const changePref = (key: keyof PushPrefs, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(async () => {
      if (!report(await updateNotificationPrefs(next))) setPrefs(previous);
    });
  };

  const test = () => {
    setMessage(undefined);
    startTransition(async () => {
      report(await sendTestNotification(), "Notification d'essai envoyée.");
    });
  };

  if (support === "checking") {
    return <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" aria-busy="true" aria-label="Chargement" />;
  }
  if (support === "install") {
    return (
      <Banner tone="warn">
        Sur iPhone, ajoute d&apos;abord Bloomy à l&apos;écran d&apos;accueil : touche Partager, puis « Sur l&apos;écran
        d&apos;accueil ». Ouvre ensuite Bloomy depuis son icône et reviens ici.
      </Banner>
    );
  }
  if (support === "unsupported") {
    return <Banner tone="warn">Ce navigateur ne permet pas les notifications web.</Banner>;
  }
  if (support === "dev") {
    return <Banner tone="warn">Les notifications ne fonctionnent que sur la version en ligne de Bloomy.</Banner>;
  }

  return (
    <div className="flex flex-col gap-4">
      {!enabled ? (
        <div className="flex flex-col items-start gap-3">
          {denied && (
            <Banner tone="warn">
              Les notifications de Bloomy sont bloquées sur cet appareil. Autorise-les dans les réglages du système
              (ou du navigateur), puis réessaie.
            </Banner>
          )}
          <Button variant="primary" onClick={enable} busy={pending} disabled={pending || !publicKey}>
            {pending ? "Activation…" : "Activer les notifications"}
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden card" aria-label="Types de notifications">
            {PREF_ROWS.map(({ key, label, hint }) => (
              <li key={key} className="flex items-center gap-3 py-1 pr-2 pl-4">
                <span className="min-w-0 flex-1 py-2">
                  <span className="block text-body font-medium">{label}</span>
                  <span className="block text-caption text-ink-muted">{hint}</span>
                </span>
                <Switch
                  checked={prefs[key]}
                  onChange={(v) => changePref(key, v)}
                  label={label}
                  disabled={key === "showValues" && !prefs.grades}
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button onClick={test} disabled={pending}>
              Envoyer un essai
            </Button>
            <Button variant="ghost" onClick={disable} disabled={pending}>
              Désactiver sur cet appareil
            </Button>
          </div>
        </>
      )}

      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-1.5 text-callout ${message.tone === "error" ? "text-danger" : "text-success"}`}
        >
          {message.tone === "error" ? (
            <AlertCircleIcon size={18} className="mt-px shrink-0" />
          ) : (
            <CheckIcon size={18} className="mt-px shrink-0" />
          )}
          {message.text}
        </p>
      )}
    </div>
  );
}
