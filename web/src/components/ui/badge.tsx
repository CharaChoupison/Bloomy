export type BadgeTone = "danger" | "warn" | "test" | "success" | "neutral";

const tones: Record<BadgeTone, string> = {
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  test: "bg-test-soft text-test",
  success: "bg-success-soft text-success",
  neutral: "bg-neutral-soft text-neutral",
};

/** Pastille d'état : toujours un mot, jamais une couleur seule. */
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
