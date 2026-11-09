import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { verifySession } from "@/lib/auth/session";
import { getPushRecord, getVapidKeys } from "@/lib/push/store";
import { siteOrigin } from "@/lib/site-origin";
import { Screen } from "@/components/screen";
import { NotificationSettings } from "./notification-settings";

export const metadata: Metadata = { title: "Notifications · Bloomy" };

export default function NotificationsPage() {
  return (
    <Screen title="Notifications" back={{ href: "/reglages", label: "Réglages" }}>
      <div className="flex flex-col gap-6">
        <p className="text-callout text-ink-muted">
          Bloomy vérifie Pronote toutes les 15 minutes, de 7 h à 22 h, et te prévient sur cet appareil quand
          une note arrive, qu&apos;un devoir est ajouté ou qu&apos;un cours est annulé ou modifié.
        </p>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-surface-sunken" aria-busy="true" aria-label="Chargement" />}>
          <Settings />
        </Suspense>
        <section aria-labelledby="notif-confidentialite" className="flex flex-col gap-2">
          <h2 id="notif-confidentialite" className="text-callout font-semibold">
            Ce que ça implique
          </h2>
          <p className="text-caption text-ink-muted">
            Pour vérifier Pronote quand l&apos;app est fermée, le serveur de Bloomy garde de quoi rouvrir ta session
            sans ton appareil. Sans notifications, ce n&apos;est pas possible : seul ton appareil détient la clé. Désactiver
            les notifications ou te déconnecter efface cet accès. Le contenu des notifications est chiffré pour ton
            appareil.{" "}
            <Link href="/confidentialite" className="rounded-sm font-medium text-accent underline underline-offset-2">
              Données et confidentialité
            </Link>
          </p>
        </section>
      </div>
    </Screen>
  );
}

async function Settings() {
  const viewer = await verifySession();
  const [record, keys] = await Promise.all([getPushRecord(viewer.id), getVapidKeys(await siteOrigin())]);
  return (
    <NotificationSettings
      publicKey={keys?.publicKey ?? null}
      enabledHere={record ? { endpoint: record.subscription.endpoint, prefs: record.prefs } : null}
    />
  );
}
