import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/auth/session";
import { getAccount } from "@/lib/pronote/account";
import { Avatar } from "@/components/avatar";
import { Screen } from "@/components/screen";
import { SensitiveField } from "@/components/sensitive-field";
import { Badge } from "@/components/ui/badge";
import { Banner, bannerActionClasses } from "@/components/ui/banner";

export const metadata: Metadata = { title: "Compte · Pronoti" };

export default function AccountPage() {
  return (
    <Screen title="Compte" back={{ href: "/plus", label: "Plus" }}>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountDetails />
      </Suspense>
    </Screen>
  );
}

async function AccountDetails() {
  await verifySession();

  let me;
  try {
    me = await getAccount();
  } catch (error) {
    console.error("[pronote]", error);
    return (
      <Banner action={<Link href="/compte" className={bannerActionClasses}>Réessayer</Link>}>
        Impossible de récupérer ton compte depuis Pronote. Réessaie dans un instant.
      </Banner>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Identité" className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-4">
        <Avatar name={me.name} src={me.photoUrl} />
        <div className="min-w-0">
          <p className="text-title break-words">{me.name}</p>
          <p className="mt-0.5 text-caption text-ink-muted">
            {[me.className, me.school].filter(Boolean).join(" · ")}
          </p>
          {me.isDelegate && (
            <div className="mt-1.5">
              <Badge tone="neutral">Délégué·e</Badge>
            </div>
          )}
        </div>
      </section>

      <Group title="Coordonnées">
        <SensitiveField label="E-mail" lines={me.email ? [me.email] : []} copyable />
        <SensitiveField label="Téléphone" lines={me.phone ? [me.phone] : []} sensitive />
      </Group>

      <Group title="Adresse">
        <SensitiveField label="Adresse postale" lines={me.address} sensitive />
      </Group>

      <Group title="Scolarité">
        <SensitiveField label="Numéro INE" lines={me.ine ? [me.ine] : []} sensitive copyable />
      </Group>

      <p className="text-caption text-ink-muted">
        Ces informations viennent de Pronote. Pour les corriger, adresse-toi à la vie scolaire.
      </p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `groupe-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-headline">
        {title}
      </h2>
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">{children}</div>
    </section>
  );
}

function AccountSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Chargement">
      <div className="h-24 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-36 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-20 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}
