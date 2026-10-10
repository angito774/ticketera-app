import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompanyDocument } from "@/modules/company/content/company.types";

export function CompanyPage({ title, intro, sections, cta }: CompanyDocument) {
  return (
    <article className="mx-auto w-full max-w-3xl leading-relaxed text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{intro}</p>

      {sections.map((section) => {
        const headingId = `${section.id}-heading`;
        return (
          <section key={section.id} aria-labelledby={headingId} className="mt-8">
            <h2 id={headingId} className="text-xl font-semibold">
              {section.title}
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
          </section>
        );
      })}

      {cta ? (
        <Link href={cta.href} className={cn(buttonVariants(), "mt-8 min-h-11")}>
          {cta.label}
        </Link>
      ) : null}
    </article>
  );
}
