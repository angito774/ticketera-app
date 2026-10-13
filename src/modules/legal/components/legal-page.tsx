import Link from "next/link";

import { formatDate } from "@/lib/format";
import type { LegalDocument } from "@/modules/legal/types/legal.types";

const DRAFT_NOTICE =
  "Este documento es un borrador informativo y no ha sido revisado por un profesional legal.";

const LINK_CLASS =
  "rounded-sm underline hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LegalPage({ title, intro, notice, updatedAt, sections }: LegalDocument) {
  return (
    <article className="mx-auto w-full max-w-3xl leading-relaxed text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground">
        {DRAFT_NOTICE}
      </p>
      {intro ? <p className="mt-4 text-muted-foreground">{intro}</p> : null}

      {sections.map((section, index) => {
        const headingId = `${section.id}-heading`;
        return (
          <section key={section.id} aria-labelledby={headingId} className="mt-8">
            <h2 id={headingId} className="text-xl font-semibold">
              {index + 1}. {section.title}
            </h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-2 text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {section.items?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : null}
            {section.links?.length ? (
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={LINK_CLASS}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}

      <footer className="mt-10 border-t border-border pt-4 text-sm text-muted-foreground">
        <p>Última actualización: {formatDate(updatedAt)}</p>
        {notice ? <p className="mt-1">{notice}</p> : null}
      </footer>
    </article>
  );
}
