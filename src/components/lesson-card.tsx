import Link from "next/link";
import type { LessonSession } from "@/lib/pronote/resources";
import { formatTime } from "@/lib/format";
import { AttachmentList } from "@/components/attachment-link";
import { SquareCheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { SubjectBar } from "@/components/grades";

/**
 * Une séance et ses contenus (Cours, TD, Correction…). L'ancre `id` permet d'y arriver
 * directement depuis l'emploi du temps ; scroll-mt laisse un peu d'air au-dessus.
 */
export function LessonCard({ s }: { s: LessonSession }) {
  return (
    <article
      id={s.anchor}
      className="scroll-mt-6 overflow-hidden card data-target:outline-2 data-target:-outline-offset-2 data-target:outline-accent"
    >
      <header className="flex gap-3 border-b border-line px-4 py-3">
        <SubjectBar subject={s.subject} />
        <div className="min-w-0 flex-1">
          <h3 className="text-body font-semibold">{s.subject}</h3>
          <p className="mt-0.5 text-caption text-ink-muted">
            <span className="font-mono tabular-nums">
              {formatTime(s.start)} – {formatTime(s.end)}
            </span>
            {s.teachers.length > 0 && ` · ${s.teachers.join(", ")}`}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-line">
        {s.contents.map((c) => (
          <li key={c.id} className="px-4 py-3">
            {(c.category || c.title) && (
              <div className="flex flex-wrap items-center gap-2">
                {c.category && <Badge tone="neutral">{c.category}</Badge>}
                {c.title && <p className="text-body font-semibold">{c.title}</p>}
              </div>
            )}
            {c.text && (
              <p className="mt-1.5 text-callout break-words whitespace-pre-line">{c.text}</p>
            )}
            <AttachmentList files={c.files} className="mt-2" />
          </li>
        ))}
      </ul>

      {s.hasAssignment && (
        <Link
          href="/devoirs"
          className="flex min-h-touch items-center gap-2 border-t border-line px-4 text-caption font-medium text-accent hover:bg-bg"
        >
          <SquareCheckIcon size={16} />
          Travail à faire pour cette séance
        </Link>
      )}
    </article>
  );
}
