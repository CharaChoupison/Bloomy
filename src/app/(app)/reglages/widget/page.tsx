import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { Suspense } from "react";
import { verifySession } from "@/lib/auth/session";
import { widgetStatus } from "@/lib/auth/widget-store";
import { Screen } from "@/components/screen";
import { WidgetSetup } from "./widget-setup";

export const metadata: Metadata = { title: "Widget iPhone · Bloomy" };

export default function WidgetPage() {
  return (
    <Screen title="Widget iPhone" back={{ href: "/reglages", label: "Réglages" }}>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface-sunken" aria-busy="true" aria-label="Chargement" />}>
        <WidgetSettings />
      </Suspense>
    </Screen>
  );
}

/** Script Scriptable, lu sur le disque (il reste un vrai fichier .js, lisible et modifiable). */
async function scriptTemplate(): Promise<string> {
  "use cache";
  return readFile(path.join(/* turbopackIgnore: true */ process.cwd(), "src", "widget", "bloomy.scriptable.js"), "utf8");
}

async function WidgetSettings() {
  const viewer = await verifySession();
  const [status, script] = await Promise.all([widgetStatus(viewer.id), scriptTemplate()]);
  return <WidgetSetup status={status} script={script} />;
}
