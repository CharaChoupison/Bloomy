import type { Metadata } from "next";
import { LinkList } from "@/components/link-list";
import { Screen } from "@/components/screen";
import { MORE_ITEMS } from "@/lib/navigation";

export const metadata: Metadata = { title: "Plus · Bloomy" };

// Menu « Plus » du téléphone : les sections qui n'ont pas d'onglet.
export default function MorePage() {
  return (
    <Screen title="Plus">
      <LinkList items={MORE_ITEMS} />
    </Screen>
  );
}
