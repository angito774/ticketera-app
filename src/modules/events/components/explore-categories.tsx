import { Drama, Music, type LucideIcon } from "lucide-react";

import { PageSection } from "@/components/page-section";
import { CategoryPill } from "@/modules/events/components/category-pill";
import {
  EVENT_CATEGORY_LABELS,
  type EventCategory,
} from "@/modules/events/types/event.types";

const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  concert: Music,
  theater: Drama,
};

export function ExploreCategories() {
  const categories = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];

  return (
    <PageSection id="explore-categories-title" title="Explora por categoría">
      <ul className="flex flex-wrap gap-4">
        {categories.map((category) => (
          <li key={category}>
            <CategoryPill
              variant="tile"
              value={category}
              label={EVENT_CATEGORY_LABELS[category].plural}
              icon={CATEGORY_ICONS[category]}
            />
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
